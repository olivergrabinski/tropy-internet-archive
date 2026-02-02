'use strict'

const { expect } = require('chai')
const fetchMock = require('fetch-mock').default
const request = require('../src/http')

describe('http request helper', () => {
  beforeEach(() => {
    fetchMock.hardReset()
    fetchMock.mockGlobal()
  })

  afterEach(() => {
    fetchMock.unmockGlobal()
  })

  it('does not append query string when qs is empty', async () => {
    fetchMock.getOnce('https://example.com/resource', {
      status: 200,
      body: { ok: true }
    })

    const result = await request('https://example.com/resource', { qs: {} })
    expect(result.ok).to.be.true
    expect(fetchMock.callHistory.called('https://example.com/resource')).to.be.true
  })

  it('appends query string when qs has keys', async () => {
    fetchMock.getOnce('https://example.com/resource?foo=bar', {
      status: 200,
      body: { ok: true }
    })

    const result = await request('https://example.com/resource', { qs: { foo: 'bar' } })
    expect(result.ok).to.be.true
    expect(fetchMock.callHistory.called('https://example.com/resource?foo=bar')).to.be.true
  })
})
