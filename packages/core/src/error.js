export default class WCError extends Error {
  constructor(message) {
    super(message)
    this.name = 'WCError'
  }
}
