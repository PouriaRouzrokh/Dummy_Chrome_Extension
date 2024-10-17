/**
 *
 * @module guarded
 */
;(() => {
  'use strict'

  /* imports */
  const stringify = require('stringify-anything')
  const curry = require('fun-curry')

  const empty = as => as.length === 0
  const isNum = x => typeof x === 'number'
  const isFun = x => typeof x === 'function'

  const objMap = (f, o) => Object.keys(o)
    .reduce((a, k) => { a[k] = f(o[k]); return a }, {})

  const show = x => `\`${stringify(x)}\``

  const toss = e => { throw e }
  const preface = 'A contract with a guarded function has been broken!\n'
  const assert = (p, s, e) => p(s) ? s : toss(e)

  const setProp = (key, value, target) =>
    Object.defineProperty(target, key, Object.defineProperty(
      Object.getOwnPropertyDescriptor(target, key),
      'value',
      { value: value }))

  const nameAndLength = (from, to) =>
    setProp('length', from.length, setProp('name', from.name, to))

  /**
   *
   * @function module:guarded.io
   *
   * @param {Function} p - (a, z) -> Boolean
   * @param {Function} f - a -> z
   *
   * @return {Function} f with (input, output) guarded by p
   */
  const io = (p, f, ...rest) => {
    assert(isFun, p,
      Error(preface + `${show(p)} should be a function`))
    assert(isFun, f,
      Error(preface + `${show(f)} should be a function`))
    assert(empty, rest,
      Error(preface + `Extra arguments passed to io: ${show(rest)}`))

    return nameAndLength(
      f,
      (...input) => {
        const output = f(...input)
        assert(
          curry(p)(input),
          output,
          Error(preface +
          `(inputs -> output) pair (${show(input)} ->` +
          ` ${show(output)}) from function ${show(f)}` +
          ` failed predicate ${show(p)}`)
        )
        return output
      })
  }

  /**
   *
   * @function module:guarded.inputs
   *
   * @param {Function} p - ([a, ...]) -> Boolean
   * @param {Function} f - (a, ...) -> z
   *
   * @return {Function} f with arguments array guarded by p
   */
  const inputs = (p, f, ...rest) => {
    assert(isFun, p,
      Error(preface + `${show(p)} should be a function`))
    assert(isFun, f,
      Error(preface + `${show(f)} should be a function`))
    assert(empty, rest,
      Error(preface + `Extra arguments passed to inputs: ${show(rest)}`))

    return nameAndLength(
      f,
      (...inputs) => {
        assert(
          p,
          inputs,
          Error(preface + `inputs ${show(inputs)} to function ${show(f)}` +
            ` failed predicate ${show(p)}`)
        )

        return f(...inputs)
      })
  }

  /**
   *
   * @function module:guarded.inputN
   *
   * @param {Number} i - index of argument to guard
   * @param {Object} p - a_i -> Boolean
   * @param {Function} f - (..., a_i, ...) -> z
   *
   * @return {Function} f with ith argument guarded by p
   */
  const inputN = (i, p, f, ...rest) => {
    assert(isNum, i,
      Error(preface + `${show(i)} should be a number`))
    assert(isFun, p,
      Error(preface + `${show(p)} should be a function`))
    assert(isFun, f,
      Error(preface + `${show(f)} should be a function`))
    assert(empty, rest,
      Error(preface + `Extra arguments passed to inputN: ${show(rest)}`))

    return nameAndLength(
      f,
      (...inputs) => {
        assert(
          p,
          inputs[i],
          Error(preface + `input ${i} ${show(inputs[i])} to function` +
            ` ${show(f)} failed predicate ${show(p)}`)
        )
        return f(...inputs)
      })
  }

  /**
   *
   * @function module:guarded.input
   *
   * @param {Function} p - a -> Boolean
   * @param {Function} f - a -> z
   *
   * @return {Function} f with single argument guarded by p
   */
  const input = (p, f, ...rest) => inputN(0, p, f, ...rest)

  /**
   *
   * @function module:guarded.output
   *
   * @param {Function} p - z -> Boolean
   * @param {Function} f - a -> z
   *
   * @return {Function} f with output guarded by p
   */
  const output = (p, f, ...rest) => {
    assert(isFun, p,
      Error(preface + `${show(p)} should be a function`))
    assert(isFun, f,
      Error(preface + `${show(f)} should be a function`))
    assert(empty, rest,
      Error(preface + `Extra arguments passed to output: ${show(rest)}`))

    return nameAndLength(
      f,
      (...inputs) => {
        const output = f(...inputs)
        assert(
          p,
          output,
          Error(preface + `output ${show(output)} of function ${show(f)}` +
            ` with arguments ${show(inputs)} failed predicate ${show(p)}`)
        )
        return output
      })
  }

  const api = { io, inputs, inputN, input, output }

  /* exports */
  module.exports = objMap(curry, api)
})()

