;(() => {
  'use strict'

  /* imports */
  const arrange = require('fun-arrange')
  const { concat, map, append, flatten } = require('fun-array')
  const { throwsWith, not, t, equalDeep } = require('fun-predicate')
  const { sync } = require('fun-test')
  const { compose, k } = require('fun-function')
  const { ap, of, get, merge } = require('fun-object')
  const { string, bool, num } = require('fun-type')
  const { gt } = require('fun-scalar')

  const guardTests = map(
    compose(merge({ contra: compose(k, get('first')) }), of('predicate')),
    [
      throwsWith([3, 3]),
      throwsWith([[[]], 3]),
      throwsWith([[[t]], 3]),
      not(throwsWith)([[[t, k(1)]], 3])
    ]
  )

  const input1 = [[string, k('S')], [bool, k('B')], [num, k('N')]]
  const input2 = [[gt(0), gt0 => ({ gt0 })], [gt(10), gt10 => ({ gt10 })]]

  const functionalityTests = map(
    compose(
      ap({ predicate: equalDeep, contra: get }),
      arrange({ inputs: 0, predicate: 1, contra: 2 })
    ),
    flatten([
      map(append('first'), [
        [[input1, 'string'], 'S'],
        [[input1, 'string'], 'S'],
        [[input1, true], 'B'],
        [[input1, 4], 'N']
      ]),
      map(append('all'), [
        [[input2, 0], []],
        [[input2, 1], [{ gt0: 1 }]],
        [[input2, 5], [{ gt0: 5 }]],
        [[input2, 11], [{ gt0: 11 }, { gt10: 11 }]],
        [[input2, 50], [{ gt0: 50 }, { gt10: 50 }]]
      ])
    ])
  )

  /* exports */
  module.exports = map(sync, concat(functionalityTests, guardTests))
})()

