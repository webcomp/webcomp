/** @jsx h */
import { Component, h } from 'preact'

function extend(obj, props) {
  // eslint-disable-next-line guard-for-in, no-restricted-syntax, no-param-reassign
  for (const i in props) obj[i] = props[i]
  return obj
}

let WC_CONTEXT = {}

async function setContext(name, nextValue) {
  WC_CONTEXT = extend(extend({}, WC_CONTEXT), { [name]: await nextValue })

  document.dispatchEvent(new CustomEvent('wc:contextUpdate', { detail: WC_CONTEXT }))
}

export default function withContext(name, initialValue = null) {
  return function withNamedContext(Comp) {
    let initialContext

    if (WC_CONTEXT[name]) {
      initialContext = WC_CONTEXT[name]
    } else if (typeof Comp.getInitialContext === 'function') {
      initialContext = Comp.getInitialContext()
    } else {
      initialContext = initialValue
    }

    setContext(name, initialContext)

    return class WCContextProvider extends Component {
      /* eslint-disable lines-between-class-members */
      static elementDidCreate = Comp.elementDidCreate
      static elementWillConnect = Comp.elementWillConnect
      static elementDidConnect = Comp.elementDidConnect
      static elementWillDisconnect = Comp.elementWillDisconnect
      static elementDidDisconnect = Comp.elementDidDisconnect
      static elementDidRender = Comp.elementDidRender
      /* eslint-enable lines-between-class-members */

      state = WC_CONTEXT

      componentDidMount = () => {
        document.addEventListener('wc:contextUpdate', this.handleContextUpdate)
      }

      componentWillUnmount = () => {
        document.removeEventListener('wc:contextUpdate', this.handleContextUpdate)
      }

      handleContextUpdate = ({ detail }) => {
        this.setState(detail)
      }

      render(props, state) {
        return (
          <Comp {...props} context={[state[name], nextValue => setContext(name, nextValue)]}>
            {props.children}
          </Comp>
        )
      }
    }
  }
}
