;(function () {
  'use strict'

  /* imports */
  const funTest = require('fun-test')

  /* exports */
  module.exports = [
    [new Error('error message'), 'Error: error message'],
    ['a string', '"a string"'],
    [3, '3'],
    [true, 'true'],
    [null, 'null'],
    [undefined, 'undefined'],
    [{}, '{}'],
    [{a: 'a'}, '{a}'],
    [{a: 'b', b: 'c'}, '{a,b}'],
    [{a: {a: 'a'}}, '{a}'],
    [[], '[]'],
    [[[]], '[[]]'],
    [function functionName () {}, 'functionName'],
    [(function () { return function () {} })(), '=>'],
    [x => x, '=>'],
    [/^.$/, '/^.$/'],
    [Error('uh oh'), 'Error: uh oh']
  ].map(([i, o]) => ({ inputs: [i], predicate: x => x === o }))
    .map(funTest.sync)
})()

