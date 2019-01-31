/**
 * Dash to Camel case
 *
 * @description Convert dash-cased-string to camelCasedString
 * @static
 * @param {string} dash - string to convert
 * @returns {string}
 * @memberof WCBaseElement
 */
export function dashToCamel(dash) {
  return dash.indexOf('-') < 0
    ? dash
    : dash.toLowerCase().replace(/-[aA-zZ]/g, m => m[1].toUpperCase())
}

/**
 * Camel to Dash case
 *
 * @description Convert camelCasedString to dash-cased-string
 * @static
 * @param {string} camel - string to convert
 * @returns {string}
 * @memberof WCBaseElement
 */
export function camelToDash(camel) {
  return camel.replace(/([A-Z])/g, '-$1').toLowerCase()
}

/**
 * Check if a string is valid JSON
 *
 * @static
 * @param {string} str
 * @returns {boolean}
 * @memberof WCBaseElement
 */
export function isValidJSON(str) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}
