import invariant from 'invariant'

/**
 * Listen to events
 *
 * @description - Define an event listener on the component
 * @param {string} eventName - Name of the event to listen to
 * @param {function} handler - Handler function
 * @memberof WebComponent
 */
export function on(eventName, handler) {
  invariant(
    typeof eventName === 'string' || Array.isArray(eventName),
    '.on() function expects an event name string or an array of event names.',
  )
  invariant(typeof handler === 'function', 'Handler must be a function.')

  const eventHandler = handler.bind(this)

  if (Array.isArray(eventName)) {
    eventName.forEach((item) => {
      invariant(typeof item === 'string', 'Event names in array must be strings.')

      document.addEventListener(item, (data) => {
        eventHandler(data.detail.payload, data.detail.sender, data)
      })
    })
  } else {
    document.addEventListener(eventName, (data) => {
      eventHandler(data.detail.payload, data.detail.sender, data)
    })
  }
}

/**
 * Trigger an event
 *
 * @description - Define an event listener on the component
 * @param {string} eventName - Name of the event to listen to
 * @param {any} eventData - Payload of an event
 * @param {string?} senderName - Optional custom sender name
 * @memberof WebComponent
 */
export function trigger(eventName, eventData, senderName) {
  // Let's check if it's a Promise
  // @TODO Babel 7 and optional chaining here
  if (eventData && eventData.then && typeof eventData.then === 'function') {
    eventData.then((payload) => {
      const sender = senderName || this.constructor.name

      const event = new CustomEvent(eventName, {
        detail: {
          payload,
          sender,
        },
      })

      document.dispatchEvent(event)
    })
  } else {
    const sender = senderName || this.constructor.name
    const event = new CustomEvent(eventName, {
      detail: {
        payload: eventData,
        sender,
      },
    })

    document.dispatchEvent(event)
  }
}
