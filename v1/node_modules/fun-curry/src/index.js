/**
 *
 * @module fun-curry
 */
;(() => {
  'use strict'

  /* imports */
  const stringify = require('stringify-anything')

  const setProp = (key, value, x) => Object.defineProperty(x, key, { value })
  const setName = (n, x) => setProp('name', n, x)
  const setLength = (n, x) => setProp('length', n, x)
  const toss = msg => { throw Error(msg) }

  const checkInputs = (f, arity, args) => {
    if (!(typeof f === 'function')) {
      toss(`${stringify(f)} should be a function`)
    }

    if (!(typeof arity === 'number')) {
      toss(`${stringify(arity)} should be a number`)
    }

    if (!(args instanceof Array)) {
      toss(`${stringify(args)} should be an Array`)
    }
  }

  const partialName = (f, args) => stringify(f) +
    (!args.length ? '' : `(${args.map(stringify).join(',')})`)

  /**
   *
   * @function module:fun-curry.curry
   *
   * @param {Function} f - function to curry
   * @param {Number} [arity] - number of arguments f should accept
   * @param {Array} [args] - initial arguments to apply
   *
   * @return {Function} a_1 -> a_2 -> ... -> a_arity -> f(a_1, ..., a_arity)
   */
  const curry = (f, arity = f.length, args = []) => {
    checkInputs(f, arity, args)

    return setName(
      partialName(f, args),
      setLength(
        arity,
        (...partialArgs) => {
          const newArgs = args
            .concat(partialArgs.length ? partialArgs : [undefined])

          return newArgs.length >= arity
            ? f.apply(null, newArgs)
            : setLength(arity - newArgs.length, curry(f, arity, newArgs))
        })
    )
  }

  /* exports */
  module.exports = curry
})()

