'use strict'

const { expect } = require('chai')
const Plugin = require('../src/plugin')

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
})
