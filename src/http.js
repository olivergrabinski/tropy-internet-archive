'use strict'

const querystring = require('querystring')
const { keys } = Object

function addQueryString(url, qs = {}) {
  if (keys(qs)) {
    url += '?' + querystring.stringify(qs)
  }
  return url
}

module.exports = async function (url, params) {
  url = addQueryString(url, params.qs)
  delete params.qs

  const res = await fetch(url, params)

  // Check if response is ok
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  // Handle empty responses or non-JSON responses
  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    const text = await res.text()
    if (text.trim() === '') {
      return {} // Return empty object for empty JSON responses
    }
    return JSON.parse(text)
  } else {
    // For non-JSON responses, return status and text
    const text = await res.text()
    return {
      status: res.status,
      statusText: res.statusText,
      body: text,
      success: res.ok
    }
  }
}
