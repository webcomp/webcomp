import pathToRegexp from 'path-to-regexp'
import invariant from 'invariant'
import { Component, h } from 'preact'
import { WebComponent } from '@webcomp/core'
import WCError from './error'

/**
 * Router specific error
 *
 * @class RouterError
 * @extends {Error}
 */
class RouterError extends Error {
  constructor(type, value, message) {
    super(
      message
        || `Router was already configured for ${type} "${value}". You should only configure it once.`,
    )
    this.name = 'RouterError'
  }
}

const R = Symbol('Router')

class Router {
  static trimSlashes = path => path.toString().replace(/\/$/, '')

  static isServer = () => typeof window === 'undefined' || !window.location || !window.history

  static clientOnly = () => {
    // If we're not in the browser, throw
    if (Router.isServer()) {
      throw new WCError('You should only use WebComp router inside the client side of your app.')
    }
  }

  constructor(options = {}) {
    const { skipInitial, mode } = options
    invariant(
      typeof skipInitial === 'boolean' || !skipInitial,
      '"options.skipInitial" must be a boolean',
    )
    invariant(
      mode === 'hash' || mode === 'history' || !mode,
      'Unexpected mode "%s". Router mode should be "hash" or "history".',
    )
    invariant(typeof options.root === 'string' || !options.root, '"options.root" must be a string')

    // Defaults
    this[R] = {
      mode: mode || 'hash', // Hash mode makes more sense for components, so default to it
      root: options.root || '/',
      handlers: new Set(),
      dirty: new Set(),
      isDirty(field) {
        return this.dirty.has(field)
      },
    }

    // If we're not in the browser (wtf), we can't listen
    if (!Router.isServer()) {
      this.listen(options.skipInitial)
    }
  }

  get mode() {
    return this[R].mode
  }

  set mode(newMode) {
    if (this[R].isDirty('mode')) {
      throw new RouterError('mode', this.mode)
    } else {
      invariant(
        newMode === 'hash' || newMode === 'history',
        'Unexpected mode "%s". Router mode should be "hash" or "history".',
        newMode,
      )

      this[R].mode = newMode
      this[R].dirty.add('mode')
    }
  }

  get root() {
    return this[R].root
  }

  set root(newRoot) {
    if (this[R].isDirty('root')) {
      throw new RouterError('root', this.root)
    } else {
      invariant(
        typeof newRoot === 'string',
        'Router root must be of type string but found unexpected %s',
        typeof newRoot,
      )

      this[R].root = Router.trimSlashes(newRoot)
      this[R].dirty.add('root')
    }
  }

  uriFragment = () => {
    Router.clientOnly()

    let fragment = ''

    if (this.mode === 'history') {
      fragment = Router.trimSlashes(decodeURI(window.location.pathname + window.location.search))
      fragment = fragment.replace(/\?(.*)$/, '')
      fragment = this.root !== '/' ? fragment.replace(this.root, '') : fragment
    } else {
      const match = window.location.href.match(/#(.*)$/)
      fragment = match ? match[1] : ''
    }

    return Router.trimSlashes(fragment)
  }

  // Listen for url changes
  listen = (skipInitial) => {
    // Don't fire handlers initially if skipInitial is set
    let current = skipInitial ? this.uriFragment() : null

    const listener = () => {
      if (current !== this.uriFragment()) {
        current = this.uriFragment()
        this.executeHandlers(current)
      }

      window.requestAnimationFrame(listener)
    }

    window.requestAnimationFrame(listener)

    return this
  }

  // Register route
  on = (routePattern, func, persist) => {
    invariant(typeof func === 'function', 'Route handler must be a function')
    invariant(
      routePattern.startsWith('/') || routePattern === '*',
      'Route must be Express-compilant ("/path/:param")',
    )

    const route = routePattern === '*' ? '(.*)' : routePattern // Support single asterisk route
    const routeTpl = route.includes('?') ? route.split('?')[0] : route
    const keys = []
    const rx = pathToRegexp(routeTpl, keys)
    const id = `_${Math.random()
      .toString(36)
      .substr(2, 9)}`

    this[R].handlers.add({
      rx,
      keys,
      func,
      id,
      persist,
    })

    return id // This can be used to dispose of individual handlers if needed
  }

  // Remove individual handlers by ID
  removeHandler = (handlerId) => {
    this[R].handlers.forEach((handler) => {
      if (handler.id === handlerId) {
        this[R].handlers.delete(handler)
      }
    })

    return this
  }

  // Reset everything. Use with caution
  dangerouslyFlushRouter = () => {
    this[R].mode = 'hash'
    this[R].root = '/'
    this[R].handlers.clear()
    this[R].dirty.clear()

    return this
  }

  // Reset handlers with the exception of those marked as persisted
  flushHandlers = () => {
    this[R].handlers.forEach((handler) => {
      if (!handler.persist) {
        this[R].handlers.delete(handler)
      }
    })

    return this
  }

  // Go through handlers and fire the ones for the current route
  executeHandlers = (f) => {
    const fullFragment = f || this.uriFragment()
    const [fragment] = fullFragment.split('?')

    this[R].handlers.forEach(({ rx, keys, func }) => {
      if (rx.test(fragment)) {
        const result = rx.exec(fragment)
        const params = keys.reduce(
          (obj, { name }, i) => ({
            ...obj,
            [name]: result[i + 1],
          }),
          {},
        )

        const query = {}

        if (fullFragment.includes('?')) {
          const [, qs] = fullFragment.split('?')
          qs.split('&').forEach((segment) => {
            const pair = segment.split('=')
            const val = pair[1] ? decodeURIComponent(pair[1]) : true
            query[pair[0]] = typeof val === 'string' && val.includes(',') ? val.split(',') : val
          })
        }

        func({ params, query, path: fragment })
      }
    })
  }

  // Navigate to a new page
  push = (path) => {
    Router.clientOnly()

    invariant(
      typeof path === 'string',
      'Path must be a string but found unexpected %s',
      typeof path,
    )
    invariant(path.length > 0, 'Path must not be empty')

    if (this.mode === 'history') {
      window.history.pushState(null, null, this.root + Router.trimSlashes(path))
    } else {
      window.location.href = `${window.location.href.replace(/#(.*)$/, '')}#${path}`
    }

    return this
  }

  // Replace history state with new page
  replace = (path) => {
    Router.clientOnly()

    invariant(
      typeof path === 'string',
      'Path must be a string but found unexpected %s',
      typeof path,
    )
    invariant(path.length > 0, 'Path must not be empty')

    if (this.mode === 'history') {
      window.history.replaceState(null, null, this.root + Router.trimSlashes(path))
    } else {
      throw new RouterError(null, null, 'Replacing state is not possible in the hash mode')
    }
  }
}

// Define the "master" router
const router = new Router()

/**
 * Decorator to provide routing props to components
 *
 * @export
 * @param {WebComponent} WrappedComponent - Component to decorate
 * @returns {WebComponent}
 */
export function routerize(WrappedComponent) {
  return class extends WebComponent {
    state = {
      push: router.push,
      replace: router.replace,
      root: router.root,
      on: router.on,
      dangerouslyFlushRouter: router.dangerouslyFlushRouter,
      flushHandlers: router.flushHandlers,
      state: {
        path: router.uriFragment(),
      },
    }

    componentDidMount = () => {
      // Due to the way default router works his will lead to double render,
      // which is usually not that big of a deal.
      // If this is a big deal, use `routerizeWithCustomRouter` and a skipInitial option
      router.on('*', url => this.setState({ state: url }), true)
    }

    render(props, state) {
      return (
        <WrappedComponent {...props} router={state}>
          {props.children}
        </WrappedComponent>
      )
    }
  }
}

/**
 * Decorator to provide routing props to components with a custom router instance
 *
 * @export
 * @param {WCRouter} r = Router instance to use
 * @returns {function}
 */
export function routerizeWith(r) {
  const decorator = WrappedComponent => class extends WebComponent {
      state = {
        push: r.push,
        replace: r.replace,
        root: r.root,
        on: r.on,
        dangerouslyFlushRouter: r.dangerouslyFlushRouter,
        flushHandlers: r.flushHandlers,
        state: {
          path: Router.isServer() ? null : r.uriFragment(),
        },
      }

      componentDidMount = () => {
        r.on('*', url => this.setState({ state: url }), true)
      }

      render(props, state) {
        return (
          <WrappedComponent {...props} router={state}>
            {props.children}
          </WrappedComponent>
        )
      }
  }

  return decorator
}

/**
 * Component that will render the content only when on a specified route
 *
 * @description Route accepts a "component" prop as well as child node.
 *              If a prop is used, component will be "routerized"
 * @export
 * @class Route
 * @extends {Component}
 */
export class Route extends Component {
  state = { path: router.uriFragment() }

  componentWillMount = () => {
    if (this.props.children.length > 0 && this.props.component) {
      throw new WCError(
        'Route expects either a "component" prop or a child node. You can\'t use both',
      )
    }
    if (this.props.children.length > 1) {
      throw new WCError(
        'Route expects a single child node. Please wrap adjacent elements in an enclosing tag.',
      )
    }
  }

  componentDidMount = () => {
    router.on('*', ({ path }) => this.setState({ path }), true)
  }

  render({
    children, path, component, customRouter, shallow,
  }) {
    if (this.state.path !== Router.trimSlashes(path)) {
      return null
    }

    if (shallow) {
      return component ? h(component) : children[0]
    }

    const decorate = customRouter ? routerizeWith(customRouter) : routerize
    return component ? h(decorate(component)) : children[0]
  }
}

export { Router as WCRouter, router as Router }
