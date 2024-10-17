;(() => {
  'use strict'

  /* imports */
  const { throwsWith, equal } = require('fun-predicate')
  const { sync } = require('fun-test')
  const { get } = require('fun-object')
  const { flatten, repeat, range, map, fold, concat, of } = require('fun-array')
  const { add, gt } = require('fun-scalar')
  const curry = require('fun-curry')
  const { id, argsToArray, k, compose } = require('fun-function')
  const prop = require('fun-property')

  const equalFor = (() => {
    const equalFor = (equal, xs, f1, f2) => prop.equalFor(xs, { equal, f1, f2 })

    return curry(equalFor)
  })()

  const tests = fold(concat, [], [
    map(
      x => ({
        predicate: equalFor(equal, x, id),
        inputs: [gt(0), id],
        contra: get('input')
      }),
      map(of, range(1, 9))
    ),
    map(
      x => ({
        predicate: throwsWith(x),
        inputs: [gt(0), id],
        contra: get('input')
      }),
      map(of, range(-9, 0))
    ),
    map(
      x => ({
        predicate: equalFor(equal, x, add),
        inputs: [argsToArray(equal), add],
        contra: get('inputs')
      }),
      map(repeat(2), range(1, 9))
    ),
    map(
      x => ({
        predicate: throwsWith(x),
        inputs: [argsToArray(equal), add],
        contra: get('inputs')
      }),
      map(n => ([n, n + 1]), range(1, 9))
    ),
    map(
      x => ({
        predicate: equalFor(equal, x, add),
        inputs: [1, equal(0), add],
        contra: get('inputN')
      }),
      map(n => ([n, 0]), range(1, 9))
    ),
    map(
      x => ({
        predicate: throwsWith(x),
        inputs: [1, equal(0), add],
        contra: get('inputN')
      }),
      map(repeat(2), range(1, 9))
    ),
    map(
      x => ({
        predicate: equalFor(equal, x, add(1)),
        inputs: [gt(0), add(1)],
        contra: get('output')
      }),
      map(of, range(0, 9))
    ),
    map(
      x => ({
        predicate: throwsWith(x),
        inputs: [gt(0), add(1)],
        contra: get('output')
      }),
      map(of, range(-9, -1))
    ),
    map(
      x => ({
        predicate: equalFor(equal, x, add(1)),
        inputs: [([i], o) => i + 1 === o, add(1)],
        contra: get('io')
      }),
      map(of, range(-5, 5))
    ),
    map(
      x => ({
        predicate: throwsWith(x),
        inputs: [([i], o) => i === o, add(1)],
        contra: get('io')
      }),
      map(of, range(-5, 5))
    ),
    map(
      ([name, x]) => ({
        predicate: throwsWith(x),
        contra: compose(k, get(name))
      }),
      flatten(map(([name, xs]) => map(x => [name, x], xs), [
        [
          'io',
          [[id, ''], ['', id], [id, id, 'extra']]
        ],
        [
          'inputs',
          [[id, ''], ['', id], [id, id, 'extra']]
        ],
        [
          'inputN',
          [['', id, id], [0, '', id], [0, id, ''], [0, id, id, 'extra']]
        ],
        [
          'input',
          [[id, ''], ['', id], [id, id, 'extra']]
        ],
        [
          'output',
          [[id, ''], ['', id], [id, id, 'extra']]
        ]
      ])))
  ])

  /* exports */
  module.exports = tests.map(sync)
})()

