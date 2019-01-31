import { render, Component, h } from 'preact'
import invariant from 'invariant'
import WCError from './error'
import { dashToCamel, isValidJSON } from './utils'

// This is used for emptying VDOM
const Null = () => null

/* eslint-disable no-underscore-dangle */
export default class WCBaseElement extends HTMLElement {
  props = {
    flags: {},
  }

  /**
   * Convert to VDOM
   *
   * @description Converts given HTML node into a Virtual DOM tree
   * @param {HTMLElement} element - Element to convert
   * @param {VNode} [node] - Virtual DOM node
   * @returns {WCComponent}
   * @memberof WCBaseElement
   */
  convertToVdom(element, node) {
    if (element.nodeType === 3) return element.nodeValue
    if (element.nodeType !== 1) return null
    if (String(element.nodeName).toLowerCase() === 'script' && !this.allowScripts) return null

    const { attributes, childNodes } = element
    const children = []

    if (node && attributes && attributes.length > 0) {
      this.mapAttributesToProps(attributes)
    }

    // If we're not using children as placeholder, go through child nodes and parse them too
    if (!this.props.flags.ignoreChildren) {
      for (let i = 0; i < childNodes.length; i += 1) {
        children[i] = this.convertToVdom(childNodes[i], null)
      }
    }

    // Preserve attributes for children
    const attrs = {}
    if (!node && attributes && attributes.length > 0) {
      for (let i = 0; i < attributes.length; i += 1) {
        const attr = attributes[i]
        attrs[attr.name] = attr.value
      }
    }

    const props = node ? this.props : attrs

    // Clear original markup
    if (node) {
      this.innerHTML = null
    }
    return h(
      // @ts-ignore
      node ? this.connectAttrsToProps(node) : element.nodeName.toLowerCase(),
      { ...props, __wc_root_el__: this },
      children,
    )
  }

  /**
   * Map attributes to props
   *
   * @description Goes through element's attributes and maps them to `this.props` and `this.flags`
   * @param {NamedNodeMap} attributes
   * @memberof WCBaseElement
   */
  mapAttributesToProps(attributes) {
    for (let i = 0; i < attributes.length; i += 1) {
      invariant(attributes[i].name !== 'flags', 'Attribute "flags" is reserved')
      if (attributes[i].name.startsWith('w:')) {
        // Map flags separately
        const flagName = dashToCamel(attributes[i].name.replace('w:', ''))
        this.props.flags[flagName] = attributes[i].value || true // Implicit boolean
      } else {
        // Map attributes to props
        const name = dashToCamel(attributes[i].name)
        this.props[name] = attributes[i].value || true // Implicit boolean

        if (isValidJSON(this.props[name])) {
          this.props[name] = JSON.parse(this.props[name])
        }
      }
    }
  }

  // Fires when custom element creates
  connectedCallback() {
    const { elementWillConnect, elementDidConnect } = this.vdomComponent
    if (elementWillConnect) elementWillConnect()

    this.initialize()

    if (elementDidConnect) elementDidConnect()
  }

  // Fires when custom element is destroyed
  disconnectedCallback() {
    const { elementWillDisconnect, elementDidDisconnect } = this.vdomComponent

    if (elementWillDisconnect) elementWillDisconnect()

    render(h(Null, {}), this.shadow || this, this.root)

    if (elementDidDisconnect) elementDidDisconnect()
  }

  /**
   * Initialize
   * @description Initialize web component
   * @memberof WCBaseElement
   */
  initialize() {
    this.observer = new MutationObserver((mutations) => {
      if (this.props.flags.protected) {
        // Lock external mutations
        throw new WCError('Attempting to change attributes of protected component')
      } else {
        const newProps = []
        mutations.forEach((mutation) => {
          const { attributeName } = mutation

          newProps.push({
            name: attributeName,
            value: this.attributes[attributeName] ? this.attributes[attributeName].value : null,
          })
        })

        this.mapAttributesToProps(newProps)

        if (this.passPropsToVdom) {
          this.passPropsToVdom(this.props)
        }
      }
    })

    // Activate observer
    this.observer.observe(this, { attributes: true, attributeOldValue: true })

    if (this.useShadow) {
      invariant(
        this.useShadow === 'open' || this.useShadow === 'closed',
        'Shadow DOM mode is expected to be "open" or "closed", but got %s',
        this.useShadow,
      )
      this.shadow = this.attachShadow({ mode: this.useShadow })
    }

    this.renderComponent()
  }

  /**
   * Connect element attributes to props
   *
   * @description Creates a higher order component that makes element's attributes
   *              available in wrapped component's 'this.props', allowing reacting
   *              to their changes via 'componentWillReceiveProps'.
   * @param {Component} WrappedComponent
   * @returns {WCComponent}
   * @memberof WCBaseElement
   */
  connectAttrsToProps(WrappedComponent) {
    const element = this // Is there a better way to do it?

    // Higher order component to link props to the outside world
    return class WCComponent extends Component {
      constructor() {
        super()
        element.passPropsToVdom = this.reinsertProps
      }

      state = {}

      /**
       * Reinsert props
       *
       * @description Updates props from attributes and triggers re-render of wrapped component
       * @param {object} attrProps
       */
      reinsertProps = (nextAttrProps) => {
        const prevState = this.state
        const attrProps = typeof nextAttrProps === 'string' && isValidJSON(nextAttrProps)
          ? JSON.parse(nextAttrProps)
          : nextAttrProps

        this.setState({
          ...prevState,
          attrProps,
        })
      }

      render() {
        return h(WrappedComponent, { ...this.props, ...this.state.attrProps })
      }
    }
  }

  /**
   * Render component
   *
   * @description Render JSX component. NOTE: This method is only called once.
   * @memberof WCBaseElement
   */
  renderComponent() {
    render(this.convertToVdom(this, this.vdomComponent), this.shadow || this, this.lastChild)

    if (this.vdomComponent.elementDidRender) this.vdomComponent.elementDidRender()
  }
}
