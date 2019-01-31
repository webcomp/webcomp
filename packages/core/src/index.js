import { Component } from 'preact'
import linkPreactState from 'linkstate'
import invariant from 'invariant'
import WCBaseElement from './WCBaseElement'
import { on, trigger } from './events'
import { camelToDash } from './utils'

export { h } from 'preact'

/**
 * Create custom element
 *
 * @description Creates a custom element from a provided component
 * @export
 * @param {WebComponent} TargetComponent - Component to render inside custom element
 * @param {object} elementOptions = WebComp options
 * @returns
 */
export function createElement(TargetComponent, elementOptions) {
  return class WCElement extends WCBaseElement {
    constructor() {
      super()
      this.allowScripts = elementOptions.allowScripts || false
      this.useShadow = elementOptions.useShadow || false

      invariant(
        typeof TargetComponent === 'string' || typeof TargetComponent === 'function',
        'Register method requires a component, but found unexpected %s',
        typeof TargetComponent,
      )

      this.vdomComponent = TargetComponent

      if (TargetComponent.elementDidCreate) TargetComponent.elementDidCreate()
    }
  }
}

export class WebComponent extends Component {
  constructor(props, state) {
    super(props, state)
    this.validateRender()

    if (this.props) {
      const { flags = {} } = this.props
      this.flags = flags
      this.rootElement = this.props.__wc_root_el__ // eslint-disable-line no-underscore-dangle

      delete this.props.flags
      delete this.props.__wc_root_el__ // eslint-disable-line no-underscore-dangle
    } else {
      this.flags = {}
      this.flags.thing = 'pew'
    }

    if (this.componentWillReceiveProps) {
      const originalHandler = this.componentWillReceiveProps.bind(this)
      this.componentWillReceiveProps = (nextProps, nextState) => {
        this.flags = nextProps.flags || {}
        originalHandler(nextProps, nextState)
      }
    } else {
      this.componentWillReceiveProps = (nextProps) => {
        this.flags = nextProps.flags || {}
      }
    }
  }

  /**
   * Async setState
   *
   * @param {any} newState - New state
   * @returns {Promise}
   * @memberof WebComponent
   */
  setStateAsync(newState) {
    return new Promise((resolve) => {
      if (typeof newState.then === 'function') {
        newState.then(result => this.setState(result, resolve))
      } else {
        this.setState(newState, resolve)
      }
    })
  }

  /**
   * Validate render method
   * @description Makes sure there's only one render method and it's actually a method
   * @memberof WebComponent
   */
  validateRender() {
    invariant(
      typeof this.render === 'function',
      'render() is expected to be a function, but got a type "%s"',
      typeof this.render,
    )
  }

  /**
   * Link component state
   *
   * @description Automatically link input changes to `this.state`
   * @param {string} statePath - key/path to update in state - can be dot-notated for deep keys
   * @param {string} valuePath - key/path into the event object at which to retrieve the new value
   * @returns {function}
   * @memberof WebComponent
   */
  linkState = (statePath, valuePath) => linkPreactState(this, statePath, valuePath)

  trigger = trigger

  on = on
}

/**
 * Register tag
 *
 * @description Register custom element as an HTML tag with the name specified
 * @param {string} tagName - Name of an HTML tag to register
 * @param {WebComponent} TargetComponent - Component to register as a tag
 * @param {object} elementOptions - WebComp element options
 * @memberof WebComponent
 */
export function register(TargetComponent, tagName, elementOptions = {}) {
  const elementName = tagName || camelToDash(TargetComponent.name).slice(1)

  invariant(elementName.includes('-'), 'Custom elements need to include "-" in the tag name')
  invariant(!elementName.startsWith('-'), 'Custom elements can\'t start with "-"')
  invariant(
    !window.customElements.get(elementName),
    `Element "${tagName}" has already been defined. You can only define element once.`,
  )
  invariant(TargetComponent, 'You need to pass the component to create element from.')

  // Define custom element
  window.customElements.define(elementName, createElement(TargetComponent, elementOptions))
}
