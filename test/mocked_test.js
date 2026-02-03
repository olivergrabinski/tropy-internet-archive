'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const fetchMock = require('fetch-mock').default
const fs = require('fs')
const { Readable } = require('stream')
const { InternetArchiveApi } = require('../src/api')
const Plugin = require('../src/plugin')
const fixtures = require('./fixtures')
const jsonld = require('jsonld')

const IA_ENDPOINT = 'https://s3.us.archive.org'
const getHeader = (headers, name) => {
  if (!headers) return undefined
  if (typeof headers.get === 'function') {
    return headers.get(name)
  }
  return headers[name] || headers[name.toLowerCase()]
}

describe('Internet Archive Mocked requests', () => {
  const context = {
    logger: {
      debug: sinon.spy(),
      error: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy()
    },
    json: {
      expand: jsonld.promises.expand
    }
  }

  const config = {
    api: {
      access_key: 'test_access',
      secret_key: 'test_secret'
    },
    collection: 'test_collection'
  }

  let statStub
  let createReadStreamStub

  beforeEach(() => {
    fetchMock.hardReset()
    fetchMock.mockGlobal()
    statStub = sinon.stub(fs.promises, 'stat').resolves({ size: 15 })
    createReadStreamStub = sinon.stub(fs, 'createReadStream').callsFake(() => (
      Readable.from(Buffer.from('fake image data'))
    ))
    context.logger.debug.resetHistory()
    context.logger.error.resetHistory()
    context.logger.info.resetHistory()
    context.logger.warn.resetHistory()
  })

  afterEach(() => {
    fetchMock.unmockGlobal()
    statStub.restore()
    createReadStreamStub.restore()
  })

  it('creates Internet Archive item with first file upload', async () => {
    const testIdentifier = 'tropy-test-item-123456'
    const filename = 'test-photo.jpg'

    fetchMock.putOnce(`begin:${IA_ENDPOINT}/${testIdentifier}/${filename}`, {
      status: 200,
      body: { success: true }
    })

    const api = new InternetArchiveApi(config, context)
    const metadata = {
      'x-amz-auto-make-bucket': '1',
      'x-archive-meta01-collection': 'test_collection',
      'x-archive-meta-title': 'Test Item'
    }

    const result = await api.uploadFile(testIdentifier, '/fake/path/test.jpg', filename, metadata)
    expect(result.success).to.be.true

    const calls = fetchMock.callHistory.calls()
    expect(calls.length).to.eql(1)
    expect(calls[0].options.method.toLowerCase()).to.eql('put')
    expect(getHeader(calls[0].options.headers, 'x-archive-meta-title')).to.eql('Test Item')
    expect(getHeader(calls[0].options.headers, 'x-amz-auto-make-bucket')).to.eql('1')
  })

  it('uploads file to Internet Archive item', async () => {
    const testIdentifier = 'tropy-test-item-123456'
    const filename = 'test-photo.jpg'

    fetchMock.putOnce(`begin:${IA_ENDPOINT}/${testIdentifier}/${filename}`, {
      status: 200,
      body: { success: true }
    })

    const api = new InternetArchiveApi(config, context)

    const result = await api.uploadFile(testIdentifier, '/fake/path/test.jpg', filename)
    expect(result.success).to.be.true
    expect(createReadStreamStub.called).to.be.true
    expect(createReadStreamStub.calledWith('/fake/path/test.jpg')).to.be.true

    const calls = fetchMock.callHistory.calls()
    expect(calls.length).to.eql(1)
    expect(calls[0].options.method.toLowerCase()).to.eql('put')
    expect(getHeader(calls[0].options.headers, 'Content-Type')).to.eql('application/octet-stream')
    expect(getHeader(calls[0].options.headers, 'Authorization')).to.match(/^LOW test_access:test_secret$/)
  })

  it('handles file upload failure gracefully', async () => {
    const testIdentifier = 'tropy-test-item-failure'
    const filename = 'test-photo.jpg'

    fetchMock.putOnce(`begin:${IA_ENDPOINT}/${testIdentifier}/${filename}`, {
      status: 403,
      body: { error: 'Access denied' }
    })

    const api = new InternetArchiveApi(config, context)
    const metadata = { 'x-archive-meta-title': 'Test Item' }

    try {
      await api.uploadFile(testIdentifier, '/fake/path/test.jpg', filename, metadata)
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).to.exist
    }
  })

  it('full plugin export workflow', async () => {
    // Mock all PUT requests to Internet Archive
    fetchMock.put('begin:https://s3.us.archive.org/', {
      status: 200,
      body: { success: true }
    })

    const plugin = new Plugin(config, context)

    const result = await plugin.export(fixtures.items)

    expect(result).to.be.an('array')
    expect(result.length).to.be.greaterThan(0)
    expect(result[0]).to.have.property('identifier')
    expect(result[0]).to.have.property('url')
    expect(result[0]).to.have.property('files')
    expect(result[0].url).to.match(/^https:\/\/archive\.org\/details\/.+-[a-f0-9]{6}$/)

    // Verify some calls were made to Internet Archive
    const allCalls = fetchMock.callHistory.calls()
    expect(allCalls.length).to.be.greaterThan(0)
  })

  it('handles file upload failures with ignoreErrors', async () => {
    const testIdentifier = 'tropy-test-item-errors'

    // Mock failed file upload
    fetchMock.putOnce(`begin:${IA_ENDPOINT}/${testIdentifier}/photo-1.jpg`, {
      status: 500,
      body: { error: 'Upload failed' }
    })

    const configWithIgnoreErrors = { ...config, ignoreErrors: true }
    const api = new InternetArchiveApi(configWithIgnoreErrors, context)

    // Try to upload a file that should fail
    try {
      await api.uploadFile(testIdentifier, '/fake/path/test.jpg', 'photo-1.jpg')
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).to.exist
    }
  })

  it('fails plugin export when ignoreErrors is false', async () => {
    fetchMock.put('begin:https://s3.us.archive.org/', {
      status: 500,
      body: { error: 'Upload failed' }
    })

    const plugin = new Plugin({ ...config, ignoreErrors: false }, context)

    try {
      await plugin.export(fixtures.items)
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).to.exist
    }
  })
})
