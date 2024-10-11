;(() => {
  'use strict'

  /* imports */
  const { equalDeep, throwsWith } = require('fun-predicate')
  const funTest = require('fun-test')
  const compose = require('fun-compose')
  const apply = require('fun-apply')
  const type = require('fun-type')

  const arrayOf = x => [x]
  const pair = (a, b) => [a, b]
  const k = x => () => x

  module.exports = [
    [
      [pair, 2, ' '],
      [pair, ' '],
      ['']
    ].map(p => ({
      inputs: [],
      predicate: throwsWith(p),
      contra: k
    })),
    [
      {
        inputs: [pair, 2, ['a']],
        predicate: compose(equalDeep(['a', 'b']), apply(['b']))
      },
      {
        inputs: [pair, 2],
        predicate: compose(equalDeep(['a', 'b']), apply(['a', 'b']))
      },
      {
        inputs: [arrayOf],
        predicate: compose(equalDeep([undefined]), apply([]))
      },
      {
        inputs: [arrayOf],
        predicate: compose(
          type.arrayOf(type.fun),
          apply([x => x])
        )
      },
      {
        inputs: [arrayOf],
        predicate: compose(
          equalDeep([['a', 2, true, null, { a: undefined }, pair]]),
          apply([['a', 2, true, null, { a: undefined }, pair]])
        )
      },
      {
        inputs: [x => x, 3, [{ a: [] }]],
        predicate: compose(type.fun, apply([]))
      },
      {
        inputs: [
          Math.pow,
          3,
          [[['a', 2, true, null, { a: undefined }, /^.$/, pair, x => x,
            Error('!'), { a: {} }]]]
        ],
        predicate: compose(type.fun, apply([]))
      },
      {
        inputs: [Math.pow],
        predicate: compose(equalDeep(8), apply([2, 3]))
      },
      {
        inputs: [Math.pow],
        predicate: compose(type.fun, apply([3]))
      },
      {
        inputs: [Math.pow],
        predicate: compose(
          equalDeep(9),
          compose(apply([2]), apply([3]))
        )
      }
    ]
  ].reduce((a, b) => a.concat(b))
    .map(funTest.sync)
})()

