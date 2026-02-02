'use strict'

const { expect } = require('chai')
const { InternetArchiveApi } = require('../src/api')
const { name: product, version } = require('../package')

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

  describe('generateIdentifier', () => {
    const api = new InternetArchiveApi()

    it('generates identifier from title', () => {
      const item = {
        'http://purl.org/dc/terms/title': [{ '@value': 'My Test Item!' }]
      }
      const identifier = api.generateIdentifier(item)
      expect(identifier).to.match(/^my-test-item--[a-f0-9]{6}$/)
    })

    it('handles untitled items', () => {
      const item = {}
      const identifier = api.generateIdentifier(item)
      expect(identifier).to.match(/^-untitled--[a-f0-9]{6}$/)
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
      expect(metadata['x-archive-meta-source']).to.eql(`${product} ${version}`)
    })

    it('maps Dublin Core properties', () => {
      const item = {
        'http://purl.org/dc/terms/title': [{ '@value': 'Test Title' }],
        'http://purl.org/dc/terms/description': [{ '@value': 'Test Description' }],
        'http://purl.org/dc/terms/creator': [{ '@value': 'Test Creator' }],
        'http://purl.org/dc/terms/contributor': [{ '@value': 'Test Contributor' }],
        'http://purl.org/dc/terms/date': [{ '@value': '2023-01-01' }],
        'http://purl.org/dc/terms/language': [{ '@value': 'French' }],
        'http://purl.org/dc/terms/subject': [{ '@value': 'postcard;switzerland' }]
      }
      const metadata = api.buildMetadata(item)

      expect(metadata['x-archive-meta-title']).to.eql('Test Title')
      expect(metadata['x-archive-meta-description']).to.eql('Test Description')
      expect(metadata['x-archive-meta-creator']).to.eql('Test Creator')
      expect(metadata['x-archive-meta-contributor']).to.eql('Test Contributor')
      expect(metadata['x-archive-meta-date']).to.eql('2023-01-01')
      expect(metadata['x-archive-meta-language']).to.eql('French')
      expect(metadata['x-archive-meta-subject']).to.eql('postcard;switzerland')
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

    it('maps publisher metadata from both namespaces', () => {
      const item1 = {
        'http://purl.org/dc/terms/publisher': [{ '@value': 'Test Publisher' }]
      }
      const item2 = {
        'http://purl.org/dc/elements/1.1/publisher': [{ '@value': 'Elements Publisher' }]
      }

      const metadata1 = api.buildMetadata(item1)
      const metadata2 = api.buildMetadata(item2)

      expect(metadata1['x-archive-meta-publisher']).to.eql('Test Publisher')
      expect(metadata2['x-archive-meta-publisher']).to.eql('Elements Publisher')
    })

    it('supports multiple values for the same metadata field', () => {
      const item = {
        'http://purl.org/dc/terms/subject': [
          { '@value': 'postcard' },
          { '@value': 'switzerland' }
        ]
      }

      const metadata = api.buildMetadata(item)

      expect(metadata['x-archive-meta01-subject']).to.eql('postcard')
      expect(metadata['x-archive-meta02-subject']).to.eql('switzerland')
    })

    it('encodes non-ASCII characters in metadata values', () => {
      const item = {
        'http://purl.org/dc/terms/title': [{ '@value': 'Café déjà vu — été' }],
        'http://purl.org/dc/terms/subject': [{ '@value': 'piñata' }]
      }

      const metadata = api.buildMetadata(item)

      expect(metadata['x-archive-meta-title']).to.eql('uri(Caf%C3%A9%20d%C3%A9j%C3%A0%20vu%20%E2%80%94%20%C3%A9t%C3%A9)')
      expect(metadata['x-archive-meta-subject']).to.eql('uri(pi%C3%B1ata)')
    })

    it('ignores empty and whitespace-only values', () => {
      const item = {
        'http://purl.org/dc/terms/title': [{ '@value': 'Valid Title' }],
        'http://purl.org/dc/terms/description': [{ '@value': '' }],
        'http://purl.org/dc/terms/creator': [{ '@value': '   ' }],
        'http://purl.org/dc/terms/publisher': [{ '@value': 'Valid Publisher' }]
      }
      const metadata = api.buildMetadata(item)

      expect(metadata['x-archive-meta-title']).to.eql('Valid Title')
      expect(metadata['x-archive-meta-description']).to.be.undefined
      expect(metadata['x-archive-meta-creator']).to.be.undefined
      expect(metadata['x-archive-meta-publisher']).to.eql('Valid Publisher')
    })
  })
})
