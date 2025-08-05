'use strict'

const { expect } = require('chai')
const Plugin = require('../src/plugin')
const { itemTitle } = require('../src/utils')

describe('Plugin', () => {
  it('config defaults', () => {
    const plugin = new Plugin()
    expect(plugin.config.ignoreErrors).to.be.true
  })

  it('creates plugin with custom config', () => {
    const config = {
      api: {
        access_key: 'test_key',
        secret_key: 'test_secret'
      },
      collection: 'test_collection',
      ignoreErrors: false
    }
    const plugin = new Plugin(config)
    expect(plugin.config.ignoreErrors).to.be.false
    expect(plugin.config.collection).to.eql('test_collection')
  })

  it('extracts item title', () => {
    const plugin = new Plugin()
    const item = {
      'http://purl.org/dc/terms/title': [{ '@value': 'Test Item' }]
    }
    expect(itemTitle(item)).to.eql('Test Item')
  })

  it('returns default title for untitled items', () => {
    const plugin = new Plugin()
    const item = {}
    expect(itemTitle(item)).to.eql('[Untitled]')
  })
})
