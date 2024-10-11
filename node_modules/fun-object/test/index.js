#!/usr/bin/env node
;(function () {
  'use strict'

  /* imports */
  var tests = require('./tests')
  var runner = require('fun-test-runner')
  var subject = require('..')

  main()

  function main () {
    runner({ tests: tests, subject: subject }, function (error) {
      if (error) {
        throw error
      }
    })
  }
})()

