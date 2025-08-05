'use strict'

const { TITLES } = require('./constants')

function itemTitle(item) {
  for (let [key, value] of Object.entries(item)) {
    if (TITLES.includes(key)) {
      return value[0]['@value']
    }
  }
  return '[Untitled]'
}

module.exports = {
  itemTitle
}