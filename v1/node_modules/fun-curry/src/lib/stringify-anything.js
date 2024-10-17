;(function () {
  'use strict'

  /* exports */
  module.exports = stringify

  /**
   *
   * @function module:stringify-anything.stringify
   *
   * @param {*} anything - to stringify
   *
   * @return {String} representation of anything
   */
  function stringify (anything) { // eslint-disable-line max-statements
    if (isPrimitive(anything)) {
      return JSON.stringify(anything)
    }

    if (anything === undefined) {
      return 'undefined'
    }

    if (anything instanceof Function) {
      return anything.name
        ? anything.name +
        '(' + repeat(anything.length, '').join(',') + ')'
        : '(' + repeat(anything.length, '').join(',') + ')=>'
    }

    if (anything instanceof RegExp || anything instanceof Error) {
      return anything.toString()
    }

    if (anything instanceof Array) {
      return '[' + anything.map(stringify).join(',') + ']'
    }

    return '{' + Object.keys(anything).join(',') + '}'
  }

  function isPrimitive (x) {
    return x === null ||
      typeof x === 'boolean' ||
      typeof x === 'number' ||
      typeof x === 'string'
  }

  function repeat (n, s) {
    return Array.apply(null, { length: n }).map(function () {
      return s
    })
  }
})()

