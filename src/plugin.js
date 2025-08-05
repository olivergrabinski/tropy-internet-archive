'use strict'

const { InternetArchiveApi } = require('./api')
const { TITLES } = require('./constants')
const { itemTitle } = require('./utils')

const configDefaults = {
  ignoreErrors: true
}

class Plugin {
  constructor(config, context) {
    this.config = Object.assign({}, configDefaults, config)
    this.context = context || {}
    this.logger = this.context.logger
  }


  async export(data) {
    const expanded = await this.context.json.expand(data)

    this.logger.info('Connecting to Internet Archive...')

    const api = new InternetArchiveApi(this.config, this.context)

    this.logger.info('Uploading to Internet Archive...')

    const results = []
    for (let grouped of expanded) {
      const { '@graph': graph } = grouped
      for (let item of graph) {
        const title = itemTitle(item)
        this.logger.info(`Item "${title}"...`)

        try {
          const result = await api.export(item)
          this.logger.info(
            `Item "${result.identifier}" uploaded with ${result.files.length} files`)
          this.logger.info(`View at: ${result.url}`)
          results.push(result)
        } catch (e) {
          this.logger.error({
            stack: e.stack
          }, `Failed to upload item "${title}"`)
          if (!this.config.ignoreErrors) {
            break
          }
        }
      }
    }

    return results
  }
}

module.exports = Plugin
