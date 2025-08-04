'use strict'

const defaults = require('../config.default')
const { name: product, version } = require('../package')
const { TROPY, IA, TITLES } = require('./constants')
const request = require('./http')
const fs = require('fs')
const { createHash } = require('crypto')
const path = require('path')

class InternetArchiveApi {
  constructor(config, context = {}) {
    this.config = Object.assign({}, defaults, config)
    this.context = context
    this.logger = this.context.logger
  }

  itemTitle(item) {
    for (let [key, value] of Object.entries(item)) {
      if (TITLES.includes(key)) {
        return value[0]['@value']
      }
    }
    return '[Untitled]'
  }

  generateIdentifier(item) {
    const title = this.itemTitle(item)
    const timestamp = Date.now()
    return `tropy-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`
  }

  buildMetadata(item) {
    const metadata = {
      'x-amz-auto-make-bucket': '1',
      'x-archive-meta01-collection': this.config.collection || 'opensource',
      'x-archive-meta-mediatype': 'image',
      'x-archive-meta-creator': 'Tropy',
      'x-archive-meta-source': `${product} ${version}`
    }

    for (let [propertyUri, values] of Object.entries(item)) {
      if (TITLES.includes(propertyUri)) {
        metadata['x-archive-meta-title'] = values[0]['@value']
      } else if (propertyUri === 'http://purl.org/dc/elements/1.1/description' ||
                 propertyUri === 'http://purl.org/dc/terms/description') {
        metadata['x-archive-meta-description'] = values[0]['@value']
      } else if (propertyUri === 'http://purl.org/dc/elements/1.1/creator' ||
                 propertyUri === 'http://purl.org/dc/terms/creator') {
        metadata['x-archive-meta-creator'] = values[0]['@value']
      } else if (propertyUri === 'http://purl.org/dc/elements/1.1/date' ||
                 propertyUri === 'http://purl.org/dc/terms/date') {
        metadata['x-archive-meta-date'] = values[0]['@value']
      }
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