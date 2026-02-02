'use strict'

const defaults = require('../config.default')
const { name: product, version } = require('../package')
const { TROPY, IA, TITLES } = require('./constants')
const request = require('./http')
const fs = require('fs')
const { createHash } = require('crypto')
const path = require('path')
const { itemTitle } = require('./utils')

class InternetArchiveApi {
  constructor(config, context = {}) {
    this.config = Object.assign({}, defaults, config)
    this.context = context
    this.logger = this.context.logger
  }


  generateIdentifier(item) {
    const title = itemTitle(item)
    const timestamp = Date.now()
    const hashInput = `${title}-${timestamp}`
    const hash = createHash('md5').update(hashInput).digest('hex')
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-')
    return `${cleanTitle}-${hash.substring(0, 6)}`
  }

  buildMetadata(item) {
    const metadata = {
      'x-amz-auto-make-bucket': '1',
      'x-archive-meta01-collection': this.config.collection || 'opensource',
      'x-archive-meta-mediatype': 'image'
    }

    // Dublin Core property mappings (supporting both elements/1.1 and terms namespaces)
    const dcMappings = {
      title: 'title',
      description: 'description',
      creator: 'creator',
      contributor: 'contributor',
      publisher: 'publisher',
      date: 'date',
      language: 'language',
      subject: 'subject',
      type: 'type',
      format: 'format',
      identifier: 'identifier',
      source: 'source',
      relation: 'relation',
      coverage: 'coverage',
      rights: 'rights'
    }

    const dcElements = 'http://purl.org/dc/elements/1.1/'
    const dcTerms = 'http://purl.org/dc/terms/'

    const encodeHeaderValue = (value) => {
      if (typeof value !== 'string') return ''

      // Remove control characters to avoid header injection issues.
      const cleaned = value.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim()
      if (!cleaned) return ''

      const hasNonAscii = /[^\x20-\x7E]/.test(cleaned)
      if (!hasNonAscii) {
        return cleaned
      }

      return `uri(${encodeURIComponent(cleaned)})`
    }

    const extractValues = (values = []) => {
      if (!Array.isArray(values)) {
        return []
      }

      const results = []
      for (const value of values) {
        if (value == null) continue
        if (typeof value === 'string') {
          const encoded = encodeHeaderValue(value)
          if (encoded) results.push(encoded)
          continue
        }
        if (typeof value === 'object' && typeof value['@value'] === 'string') {
          const encoded = encodeHeaderValue(value['@value'])
          if (encoded) results.push(encoded)
        }
      }

      return results
    }

    const metaValues = new Map()
    metaValues.set('source', [`${product} ${version}`])

    const setMetaValues = (metaName, values, { replace = false } = {}) => {
      if (!values.length) return
      if (!metaValues.has(metaName) || replace) {
        metaValues.set(metaName, values.slice())
        return
      }
      metaValues.set(metaName, metaValues.get(metaName).concat(values))
    }

    for (let [propertyUri, values] of Object.entries(item)) {
      if (TITLES.includes(propertyUri)) {
        const titleValues = extractValues(values)
        setMetaValues('title', titleValues, { replace: true })
      } else {
        // Check for Dublin Core properties
        const dcProperty = propertyUri.startsWith(dcElements)
          ? propertyUri.slice(dcElements.length)
          : propertyUri.startsWith(dcTerms)
              ? propertyUri.slice(dcTerms.length)
              : null

        if (!dcProperty || !dcMappings[dcProperty]) {
          continue
        }

        const metaName = dcMappings[dcProperty]
        const extractedValues = extractValues(values)
        const replace = metaName === 'creator' || metaName === 'source' || metaName === 'title'
        setMetaValues(metaName, extractedValues, { replace })
      }
    }

    for (const [metaName, values] of metaValues.entries()) {
      if (values.length === 1) {
        metadata[`x-archive-meta-${metaName}`] = values[0]
        continue
      }
      values.forEach((value, index) => {
        const suffix = String(index + 1).padStart(2, '0')
        metadata[`x-archive-meta${suffix}-${metaName}`] = value
      })
    }

    return metadata
  }

  async uploadFile(identifier, filePath, filename, metadata = {}) {
    this.logger.debug(`Reading file: ${filePath}`)
    const fileBuffer = await fs.promises.readFile(filePath)
    this.logger.debug(`File size: ${fileBuffer.length} bytes`)

    const md5Hash = createHash('md5').update(fileBuffer).digest('hex')
    this.logger.debug(`MD5 hash: ${md5Hash}`)

    const url = `${IA.ENDPOINT}/${identifier}/${filename}`
    this.logger.debug(`Upload URL: ${url}`)

    const headers = {
      'User-Agent': `${product} ${version}`,
      'Content-MD5': md5Hash,
      'Content-Type': 'application/octet-stream',
      'Authorization': `LOW ${this.config.api.access_key}:${this.config.api.secret_key}`,
      ...metadata
    }

    this.logger.debug('Upload headers:', headers)

    const response = await request(url, {
      method: 'PUT',
      headers,
      body: fileBuffer
    })

    this.logger.debug('Upload response:', response)
    return response
  }

  async export(item) {
    const identifier = this.generateIdentifier(item)
    const metadata = this.buildMetadata(item)

    this.logger.info(`Creating Internet Archive item: ${identifier}`)

    const photos = item[TROPY.PHOTO] ? item[TROPY.PHOTO][0]['@list'] : []
    this.logger.info(`Found ${photos.length} photos to upload`)
    this.logger.debug('Photos data:', photos)

    if (photos.length === 0) {
      this.logger.error('No photos found to upload')
      return {
        identifier,
        url: `https://archive.org/details/${identifier}`,
        files: [],
        error: 'No photos to upload'
      }
    }

    const uploadedFiles = []
    let itemCreated = false

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      this.logger.debug(`Processing photo ${i + 1}:`, photo)

      const filePath = photo[TROPY.PATH][0]['@value']
      const ext = path.extname(filePath)
      const filename = `photo-${i + 1}${ext}`

      this.logger.info(`Processing file: ${filePath} -> ${filename}`)

      try {
        this.logger.info(`Uploading ${filename}...`)

        // Include metadata headers only for the first file to create the item
        const uploadMetadata = itemCreated ? {} : metadata
        if (!itemCreated) {
          this.logger.info(`Creating item ${identifier} with first file upload`)
        }

        await this.uploadFile(identifier, filePath, filename, uploadMetadata)
        uploadedFiles.push(filename)
        this.logger.info(`Successfully uploaded ${filename}`)

        if (!itemCreated) {
          this.logger.info(`Item ${identifier} created successfully`)
          itemCreated = true
        }

      } catch (error) {
        this.logger.error(`Failed to upload ${filename}: ${error.message}`)
        if (this.config.ignoreErrors) {
          continue
        } else {
          throw error
        }
      }
    }

    return {
      identifier,
      url: `https://archive.org/details/${identifier}`,
      files: uploadedFiles
    }
  }
}

module.exports = {
  InternetArchiveApi
}
