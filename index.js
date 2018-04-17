const settle = require('axios/lib/core/settle')

const url = require('url')

const completion = require('agreed-core/lib/check/completion')
const format = require('agreed-core/lib/template/format')
const bind = require('agreed-core/lib/template/bind')
const Checker = require('agreed-core/lib/check/checker')
const hasTemplate = require('agreed-core/lib/template/hasTemplate').hasTemplate
const isContentJSON = require('agreed-core/lib/check/isContentJSON')

/**
 * @param {Object[]} agrees The array of agrees.
 * @param {Object} config The axios configuration object.
 */
module.exports = agrees => config => new Promise((resolve, reject) => {
  const res = {}

  agrees = agrees.map(agreement => completion(agreement, '', {}))

  const axiosRequest = { ...config, query: config.params }

  // set axiosRequest.body if axiosRequest.data exists
  if (axiosRequest.data) {
    try {
      axiosRequest.body = JSON.parse(axiosRequest.data)
    } catch (e) {
      throw new Error(`Unknown form of axios data: ${axiosRequest.data}`)
    }
  }

  const agreesWithResults = agrees.map(agree => {
    const { result, similarity, error } = Checker.request(agree.request, axiosRequest, {
      pathToRegexpKeys: agree.request.pathToRegexpKeys,
      values: agree.request.values,
      debug: false
    })
    return { agree, result, similarity, error }
  })

  const result = agreesWithResults.find(({ result }) => result)

  if (!result || !result.agree) {
    let message

    const { agree, similarity, error } = agreesWithResults
      .sort((a, b) => b.similarity - a.similarity).shift()

    if (similarity > 1) {
      delete agree.request.pathToRegexp
      delete agree.request.pathToRegexpKeys

      const reqForErrMsg = {
        url: axiosRequest.url,
        method: axiosRequest.method,
        data: axiosRequest.data,
        headers: axiosRequest.headers,
        params: axiosRequest.query
      }

      message = `Agree Not Found, actual request is ${JSON.stringify(reqForErrMsg)}, but similar agree request is ${JSON.stringify(agree.request)}, error: ${error}`
    } else {
      message = 'Agree Not Found'
    }

    res.data = message
    res.status = 404
    res.statusText = 'Not Found'
    res.headers = { 'Content-Type': 'text/plain' }
    res.config = config
    res.result = {}

    setTimeout(() => { settle(resolve, reject, res) }, 0)

    return
  }

  const { agree } = result

  if (agree.request.pathToRegexpKeys.length > 0) {
    const pathname = url.parse(axiosRequest.url).pathname
    const result = agree.request.pathToRegexp.exec(pathname)
    const values = {}

    agree.request.pathToRegexpKeys.forEach((pathKey, index) => {
      values[pathKey.name] = result[index + 1]
    })

    agree.request.values = values
  }

  if (agree.request.headers && hasTemplate(JSON.stringify(agree.request.headers))) {
    agree.request.values = Object.assign({}, agree.request.values, bind(agree.request.headers, axiosRequest.headers))
  }

  if (agree.request.query && hasTemplate(JSON.stringify(agree.request.query))) {
    agree.request.values = Object.assign({}, agree.request.values, bind(agree.request.query, axiosRequest.query))
  }

  if (agree.request.body && hasTemplate(JSON.stringify(agree.request.body))) {
    agree.request.values = Object.assign({}, agree.request.values, bind(agree.request.body, axiosRequest.body))
  }

  let messageBody = agree.response.body || ''

  if (agree.request.values) {
    messageBody = format(messageBody, agree.request.values, agree.response.funcs)
  }

  if (agree.response.values) {
    messageBody = format(messageBody, Object.assign({}, agree.response.values, agree.request.values), agree.response.funcs)
  }

  if (isContentJSON(agree.response)) {
    messageBody = JSON.stringify(messageBody)
  }

  const headers = {}
  Object.keys(agree.response.headers).forEach((header) => {
    headers[header] = format(agree.response.headers[header], Object.assign({}, agree.response.values || {}, agree.request.values || {}), agree.response.funcs)
  })

  res.data = messageBody
  res.statusCode = agree.response.status
  res.status = agree.response.status
  res.statusText = ''
  res.headers = headers
  res.config = config
  res.request = config

  setTimeout(() => { settle(resolve, reject, res) }, 0)
})
