/**
 *
 * @module stringify-anything
 */
;(() => {
  'use strict'

  const isPrimitive = x => x === null ||
    typeof x === 'boolean' ||
    typeof x === 'number' ||
    typeof x === 'string'

  /**
   *
   * @function module:stringify-anything.stringify
   *
   * @param {*} x - to stringify
   *
   * @return {String} representation of x
   */
  const stringify = x => isPrimitive(x)
    ? JSON.stringify(x)
    : x === undefined
      ? 'undefined'
      : x instanceof Function
        ? (x.name || '=>')
        : (x instanceof RegExp || x instanceof Error)
          ? x.toString()
          : x instanceof Array
            ? `[${x.map(stringify).join(',')}]`
            : `{${Object.keys(x).join(',')}}`

  /* exports */
  module.exports = stringify
})()

