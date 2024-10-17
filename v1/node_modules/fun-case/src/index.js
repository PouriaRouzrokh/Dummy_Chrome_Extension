/**
 *
 * @module fun-case
 */
;(() => {
  'use strict'

  /* imports */
  const { inputs, output } = require('guarded')
  const curry = require('fun-curry')
  const { array, arrayOf, tuple, fun, any } = require('fun-type')
  const { map, ap } = require('fun-object')

  /**
   *
   * @function module:fun-case.first
   *
   * @param {Array<Array<Function>>} cases - [[predicate, function]]
   * @param {*} subject - to apply to case function
   *
   * @return {*} result of applying subject to the appropriate case function
   */
  const first = (cases, subject) => {
    for (var i = 0; i < cases.length; i++) {
      if (cases[i][0](subject)) return cases[i][1](subject)
    }
  }

  /**
   *
   * @function module:fun-case.all
   *
   * @param {Array<Array<Function>>} cases - [[predicate, function]]
   * @param {*} subject - to apply to case function
   *
   * @return {Array} f_i(subject) for each p_i(subject) === true
   */
  const all = (cases, subject) =>
    cases.reduce((r, [p, f]) => p(subject) ? [...r, f(subject)] : r, [])

  /* exports */
  const api = { first, all }

  const pairsOfFunctions = arrayOf(tuple([fun, fun]))
  const compose = (f, g) => x => f(g(x))

  const guards = {
    first: inputs(tuple([pairsOfFunctions, any])),
    all: compose(output(array), inputs(tuple([pairsOfFunctions, any])))
  }

  module.exports = map(curry, ap(guards, api))
})()

