/**
 *
 * @module fun-type
 */
;(() => {
  'use strict'

  /* imports */
  const curry = require('fun-curry')
  const { keys, values, keep, ap: oAp, map: oMap } = require('fun-object')
  const { inputs, output } = require('guarded')

  const all = as => as.reduce((a, b) => a && b, true)
  const compose = f => g => x => f(g(x))
  const typeOf = t => x => typeof x === t

  /**
   *
   * @function module:fun-type.any
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} true
   */
  const any = () => true

  /**
   *
   * @function module:fun-type.bool
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a bool
   */
  const bool = typeOf('boolean')

  /**
   *
   * @function module:fun-type.integer
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a finite integer
   */
  const integer = subject => num(subject) && Math.floor(subject) === subject &&
    Math.abs(subject) !== Infinity

  /**
   *
   * @function module:fun-type.num
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a number
   */
  const num = typeOf('number')

  /**
   *
   * @function module:fun-type.string
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a string
   */
  const string = typeOf('string')

  /**
   *
   * @function module:fun-type.fun
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a function
   */
  const fun = typeOf('function')

  /**
   *
   * @function module:fun-type.instanceOf
   *
   * @param {Function} constructor - defining instance
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is instanceof constructor
   */
  const instanceOf = (constructor, subject) => subject instanceof constructor

  /**
   *
   * @function module:fun-type.array
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is an array
   */
  const array = curry(instanceOf)(Array)

  /**
   *
   * @function module:fun-type.arrayOf
   *
   * @param {Function} predicate - to check type of each value in subject
   * @param {*} subject - to check
   *
   * @return {Boolean} if each element in subject passes predicate
   */
  const arrayOf = (predicate, subject) => array(subject) &&
    all(subject.map(x => predicate(x)))

  /**
   *
   * @function module:fun-type.vector
   *
   * @param {Number} length - of vector
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is an array
   */
  const vector = (length, subject) =>
    array(subject) && subject.length === length

  /**
   *
   * @function module:fun-type.vectorOf
   *
   * @param {Number} length - of vector
   * @param {Function} predicate - to check type of each value in subject
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is an array
   */
  const vectorOf = (length, predicate, subject) =>
    vector(length, subject) && arrayOf(predicate, subject)

  /**
   *
   * @function module:fun-type.tuple
   *
   * @param {Array} elements - of the tuple
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a tuple described by elements
   */
  const tuple = (elements, subject) => vector(elements.length, subject) &&
    all(elements.map((p, i) => p(subject[i])))

  /**
   *
   * @function module:fun-type.matrix
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a matrix
   */
  const matrix = subject => array(subject) &&
    subject.length > 0 &&
    arrayOf(curry(vector)(subject[0].length), subject)

  /**
   *
   * @function module:fun-type.matrixOf
   *
   * @param {Function} predicate - to check type of each value in subject
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a matrix
   */
  const matrixOf = (predicate, subject) => matrix(subject) &&
    arrayOf(curry(vectorOf)(subject[0].length, predicate), subject)

  /**
   *
   * @function module:fun-type.object
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is an object
   */
  const object = subject => typeOf('object')(subject) && subject !== null

  /**
   *
   * @function module:fun-type.objectOf
   *
   * @param {Function} predicate - to check type of each value in subject
   * @param {*} subject - to check
   *
   * @return {Boolean} if each enumerable property of subject passes predicate
   */
  const objectOf = (predicate, subject) => object(subject) &&
    all(values(subject).map(v => predicate(v)))

  /**
   *
   * @function module:fun-type.hasFields
   *
   * @param {Object} fields - that subject must have
   * @param {*} subject - to check
   *
   * @return {Boolean} if fields of subject match types described in fields
   */
  const hasFields = (fields, subject) => object(subject) &&
    all(values(oAp(fields, keep(keys(fields), subject))))

  /**
   *
   * @function module:fun-type.record
   *
   * @param {Object} fields - of the record
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a record described by fields
   */
  const record = (fields, subject) => hasFields(fields, subject) &&
    vector(keys(fields).length, keys(subject))

  /**
   *
   * @function module:fun-type.pojo
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a plain old JavaScript object
   */
  const pojo = subject => object(subject) &&
    Object.getPrototypeOf(subject) === Object.prototype

  /**
   *
   * @function module:fun-type.regExp
   *
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a RegExp
   */
  const regExp = curry(instanceOf)(RegExp)

  /**
   *
   * @function module:fun-type.member
   *
   * @param {Function} equal - (a, b) -> bool
   * @param {Array} set - that subject should be a member of
   * @param {*} subject - to check
   *
   * @return {Boolean} if subject is a member of set based on equal function
   */
  const member = (equal, set, subject) =>
    set.reduce((a, b) => a || equal(b, subject), false)

  const api = { bool, num, string, object, pojo, array, vector, matrix, fun,
    record, hasFields, tuple, objectOf, arrayOf, vectorOf, matrixOf, regExp,
    instanceOf, any, member, integer }

  const guards = oMap(compose(output(bool)), oMap(inputs, {
    bool: curry(vector)(1),
    num: curry(vector)(1),
    integer: curry(vector)(1),
    string: curry(vector)(1),
    object: curry(vector)(1),
    pojo: curry(vector)(1),
    array: curry(vector)(1),
    vector: curry(tuple)([num, any]),
    fun: curry(vector)(1),
    record: curry(tuple)([curry(objectOf)(fun), any]),
    hasFields: curry(tuple)([curry(objectOf)(fun), any]),
    tuple: curry(tuple)([curry(arrayOf)(fun), any]),
    objectOf: curry(tuple)([fun, any]),
    arrayOf: curry(tuple)([fun, any]),
    vectorOf: curry(tuple)([num, fun, any]),
    matrixOf: curry(tuple)([fun, any]),
    regExp: curry(vector)(1),
    instanceOf: curry(tuple)([fun, any]),
    any: curry(vector)(1),
    member: curry(tuple)([fun, array, any])
  }))

  /* exports */
  module.exports = oMap(curry, oAp(guards, api))
})()

