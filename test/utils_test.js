'use strict'

const { expect } = require('chai')
const { itemTitle } = require('../src/utils')

describe('itemTitle', () => {
  it('extracts title from Dublin Core terms', () => {
    const item = {
      'http://purl.org/dc/terms/title': [{ '@value': 'Test Title' }]
    }
    expect(itemTitle(item)).to.eql('Test Title')
  })

  it('extracts title from Dublin Core elements', () => {
    const item = {
      'http://purl.org/dc/elements/1.1/title': [{ '@value': 'Another Title' }]
    }
    expect(itemTitle(item)).to.eql('Another Title')
  })

  it('returns default for untitled items', () => {
    const item = {}
    expect(itemTitle(item)).to.eql('[Untitled]')
  })
})