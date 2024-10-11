;(() => {
  'use strict'

  /* imports */
  const { equalDeep } = require('fun-predicate')
  const { ap, get } = require('fun-object')
  const { sync } = require('fun-test')
  const arrange = require('fun-arrange')
  const { append, concat, range } = require('fun-array')

  const isNum = x => typeof x === 'number'
  const isStr = x => typeof x === 'string'
  const isBool = x => typeof x === 'boolean'

  const abNumString = {
    a: isNum,
    b: isStr
  }

  const boolNumStr = [isBool, isNum, isStr]

  const adHocTests = [
    function degenerateMatrixOf (subject, callback) {
      try {
        callback(null, subject.matrixOf(subject.num, []) === false)
      } catch (e) {
        callback(e)
      }
    },
    function nestedVectorOf (subject, callback) {
      try {
        callback(null, subject.vectorOf(
          2,
          subject.vectorOf(
            1,
            subject.num
          )
        )([[1], [2]]) === true)
      } catch (e) {
        callback(e)
      }
    }
  ]

  const tests = [
    [
      [[isNum, [[0, '0'], [0, 1]]], false],
      [[isNum, [[0, 0], [0, 1]]], true],
      [[isNum, [[0], [0, 1]]], false],
      [[isNum, [[], [1]]], false],
      [[isNum, [[], []]], true],
      [[isNum, [[]]], true]
    ].map(append('matrixOf')),
    [
      [[[[0, 0], [0, 1]]], true],
      [[[[0], [0, 1]]], false],
      [[[[], [1]]], false],
      [[[[], []]], true],
      [[[[]]], true]
    ].map(append('matrix')),
    [
      [[2, isNum, [4, 3]], true],
      [[3, isNum, [4, 3]], false],
      [[3, isNum, [4, 3, -4.3]], true],
      [[3, isNum, [4, '3', -4.3]], false],
      [[3, isStr, ['4', 'hi']], false],
      [[2, isStr, ['4', 'hi']], true],
      [[2, isStr, [4, 'hi']], false]
    ].map(append('vectorOf')),
    [
      [[isNum, [4, 3]], true],
      [[isNum, [4, 3, -4.3]], true],
      [[isNum, [4, '3', -4.3]], false],
      [[isStr, ['4', 'hi']], true],
      [[isStr, [4, 'hi']], false]
    ].map(append('arrayOf')),
    [
      [[isNum, { a: 4, b: 4 }], true],
      [[isNum, { a: 4, b: '4' }], false],
      [[isBool, { a: true, b: false, c: true }], true],
      [[isBool, { a: 'true', b: false, c: true }], false]
    ].map(append('objectOf')),
    [
      [[abNumString, { a: 4, b: '4' }], true],
      [[abNumString, { a: 4, b: '4', c: 'xtra' }], true],
      [[abNumString, { a: '4', b: '4' }], false]
    ].map(append('hasFields')),
    [
      [[boolNumStr, [true, 4, '4']], true],
      [[boolNumStr, [true, 4, '4', '5']], false],
      [[boolNumStr, [true, '4', '4']], false]
    ].map(append('tuple')),
    [
      [[abNumString, { a: 4, b: '4' }], true],
      [[abNumString, { a: 4, b: '4', c: 'xtra' }], false],
      [[abNumString, { a: '4', b: '4' }], false]
    ].map(append('record')),
    [
      [[true], true],
      [[false], true],
      [[4], false],
      [[{}], false],
      [[null], false],
      [[], false],
      [['true'], false]
    ].map(append('bool')),
    [
      [[0], true],
      [[1], true],
      [[-100.4], true],
      [['1'], false],
      [[null], false],
      [[], false],
      [['true'], false]
    ].map(append('num')),
    [
      [[true], false],
      [[4], false],
      [[{}], false],
      [[null], false],
      [[], false],
      [['true'], true]
    ].map(append('string')),
    [
      [[0], false],
      [['1'], false],
      [[null], false],
      [[], false],
      [[{}], true],
      [[new Error()], true]
    ].map(append('object')),
    [
      [[0], false],
      [['1'], false],
      [[null], false],
      [[], false],
      [[{}], true],
      [[new Error()], false]
    ].map(append('pojo')),
    [
      [[0], false],
      [['1'], false],
      [[null], false],
      [[], false],
      [[[]], true],
      [[{}], false],
      [[new Error()], false]
    ].map(append('array')),
    [
      [[RegExp('[0-9]+', 'g')], true],
      [[/[0-9]+/g], true],
      [[0], false],
      [['1'], false],
      [[null], false],
      [[], false],
      [[[]], false],
      [[{}], false],
      [[new Error()], false]
    ].map(append('regExp')),
    [
      [[Array, 0], false],
      [[String, '1'], false],
      [[Date, null], false],
      [[RegExp, undefined], false],
      [[Array, []], true],
      [[Error, {}], false],
      [[RegExp, /[0-9]+/g], true],
      [[RegExp, RegExp('e')], true],
      [[Error, RegExp('e')], false],
      [[Error, Error()], true],
      [[RegExp, Error()], false]
    ].map(append('instanceOf')),
    [
      [[0], true],
      [['1'], true],
      [[null], true],
      [[undefined], true],
      [[[]], true],
      [[{}], true],
      [[/[0-9]+/g], true],
      [[RegExp('e')], true],
      [[Error()], true]
    ].map(append('any')),
    [
      [[equalDeep, range(1, 8), 0], false],
      [[equalDeep, range(1, 8), 1], true],
      [[equalDeep, range(1, 8), 2], true],
      [[equalDeep, range(1, 8), 8], true],
      [[equalDeep, range(1, 8), 9], false],
      [[equalDeep, [{ a: 1 }, { b: 2 }], { a: 1 }], true],
      [[equalDeep, [{ a: 1 }, { b: 2 }], { a: 2 }], false]
    ].map(append('member')),
    [
      [[1], true],
      [[1.00], true],
      [[123], true],
      [[-123], true],
      [[0], true],
      [[0.1], false],
      [[-0.1], false],
      [[Infinity], false],
      [[-Infinity], false],
      [[NaN], false]
    ].map(append('integer'))
  ].reduce(concat, [])
    .map(arrange({ inputs: 0, predicate: 1, contra: 2 }))
    .map(ap({
      predicate: equalDeep,
      contra: get
    }))

  /* exports */
  module.exports = tests.map(sync).concat(adHocTests)
})()

