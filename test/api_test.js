'use strict'

const { expect } = require('chai')
const { InternetArchiveApi } = require('../src/api')
const { TITLES } = require('../src/constants')

describe('InternetArchiveApi', () => {
  const mockConfig = {
    api: {
      access_key: 'test_access',
      secret_key: 'test_secret'
    },
    collection: 'test_collection'
  }

  const mockContext = {
    logger: {
      info: () => {},
      error: () => {},
      debug: () => {}
    }
  }

  it('creates API instance with defaults', () => {
    const api = new InternetArchiveApi()
    expect(api.config.collection).to.eql('opensource')
    expect(api.config.api.access_key).to.eql('<your_access_key>')
  })

  it('creates API instance with custom config', () => {
    const api = new InternetArchiveApi(mockConfig, mockContext)
    expect(api.config.collection).to.eql('test_collection')
    expect(api.config.api.access_key).to.eql('test_access')
  })

  describe('itemTitle', () => {
    const api = new InternetArchiveApi()

    it('extracts title from Dublin Core terms', () => {
      const item = {
        'http://purl.org/dc/terms/title': [{ '@value': 'Test Title' }]
      }
      expect(api.itemTitle(item)).to.eql('Test Title')
    })

    it('extracts title from Dublin Core elements', () => {
      const item = {
        'http://purl.org/dc/elements/1.1/title': [{ '@value': 'Another Title' }]
      }
      expect(api.itemTitle(item)).to.eql('Another Title')
    })

    it('returns default for untitled items', () => {
      const item = {}
      expect(api.itemTitle(item)).to.eql('[Untitled]')
    })
  })

  describe('generateIdentifier', () => {
    const api = new InternetArchiveApi()

    it('generates identifier from title', () => {
      const item = {
        'http://purl.org/dc/terms/title': [{ '@value': 'My Test Item!' }]
      }
      const identifier = api.generateIdentifier(item)
      expect(identifier).to.match(/^tropy-my-test-item--\d+$/)
    })

    it('handles untitled items', () => {
      const item = {}
      const identifier = api.generateIdentifier(item)
      expect(identifier).to.match(/^tropy--untitled--\d+$/)
    })
  })

  describe('buildMetadata', () => {
    const api = new InternetArchiveApi(mockConfig)

    it('builds basic metadata headers', () => {
      const item = {
        'http://purl.org/dc/terms/title': [{ '@value': 'Test Item' }]
      }
      const metadata = api.buildMetadata(item)
      
      expect(metadata['x-amz-auto-make-bucket']).to.eql('1')
      expect(metadata['x-archive-meta01-collection']).to.eql('test_collection')
      expect(metadata['x-archive-meta-mediatype']).to.eql('image')
      expect(metadata['x-archive-meta-title']).to.eql('Test Item')
    })

    it('maps Dublin Core properties', () => {
      const item = {
        'http://purl.org/dc/terms/title': [{ '@value': 'Test Title' }],
        'http://purl.org/dc/terms/description': [{ '@value': 'Test Description' }],
        'http://purl.org/dc/terms/creator': [{ '@value': 'Test Creator' }],
        'http://purl.org/dc/terms/date': [{ '@value': '2023-01-01' }]
      }
      const metadata = api.buildMetadata(item)
      
      expect(metadata['x-archive-meta-title']).to.eql('Test Title')
      expect(metadata['x-archive-meta-description']).to.eql('Test Description')
      expect(metadata['x-archive-meta-creator']).to.eql('Test Creator')
      expect(metadata['x-archive-meta-date']).to.eql('2023-01-01')
    })

    it('handles DC elements namespace', () => {
      const item = {
        'http://purl.org/dc/elements/1.1/title': [{ '@value': 'Elements Title' }],
        'http://purl.org/dc/elements/1.1/description': [{ '@value': 'Elements Description' }]
      }
      const metadata = api.buildMetadata(item)
      
      expect(metadata['x-archive-meta-title']).to.eql('Elements Title')
      expect(metadata['x-archive-meta-description']).to.eql('Elements Description')
    })
  })
})
