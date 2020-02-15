"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var settle = require('axios/lib/core/settle');

var url = require('url');

var completion = require('@agreed/core/lib/check/completion');

var format = require('@agreed/core/lib/template/format');

var bind = require('@agreed/core/lib/template/bind');

var Checker = require('@agreed/core/lib/check/checker');

var hasTemplate = require('@agreed/core/lib/template/hasTemplate').hasTemplate;

var isContentJSON = require('@agreed/core/lib/check/isContentJSON');
/**
 * @param {Object[]} agrees The array of agrees.
 * @param {Object} config The axios configuration object.
 */


module.exports = function (agrees) {
  return function (config) {
    return new Promise(function (resolve, reject) {
      var res = {};
      agrees = agrees.map(function (agreement) {
        return completion(agreement, '', {});
      });

      var axiosRequest = _objectSpread({}, config, {
        query: config.params
      }); // set axiosRequest.body if axiosRequest.data exists


      if (axiosRequest.data) {
        try {
          axiosRequest.body = JSON.parse(axiosRequest.data);
        } catch (e) {
          throw new Error("Unknown form of axios data: ".concat(axiosRequest.data));
        }
      }

      var agreesWithResults = agrees.map(function (agree) {
        var _Checker$request = Checker.request(agree.request, axiosRequest, {
          pathToRegexpKeys: agree.request.pathToRegexpKeys,
          values: agree.request.values,
          debug: false
        }),
            result = _Checker$request.result,
            similarity = _Checker$request.similarity,
            error = _Checker$request.error;

        return {
          agree: agree,
          result: result,
          similarity: similarity,
          error: error
        };
      });
      var result = agreesWithResults.find(function (_ref) {
        var result = _ref.result;
        return result;
      });

      if (!result || !result.agree) {
        var message;

        var _agreesWithResults$so = agreesWithResults.sort(function (a, b) {
          return b.similarity - a.similarity;
        }).shift(),
            _agree = _agreesWithResults$so.agree,
            similarity = _agreesWithResults$so.similarity,
            error = _agreesWithResults$so.error;

        if (similarity > 1) {
          delete _agree.request.pathToRegexp;
          delete _agree.request.pathToRegexpKeys;
          var reqForErrMsg = {
            url: axiosRequest.url,
            method: axiosRequest.method,
            data: axiosRequest.data,
            headers: axiosRequest.headers,
            params: axiosRequest.query
          };
          message = "Agree Not Found, actual request is ".concat(JSON.stringify(reqForErrMsg), ", but similar agree request is ").concat(JSON.stringify(_agree.request), ", error: ").concat(error);
        } else {
          message = 'Agree Not Found';
        }

        res.data = message;
        res.status = 404;
        res.statusText = 'Not Found';
        res.headers = {
          'Content-Type': 'text/plain'
        };
        res.config = config;
        res.result = {};
        setTimeout(function () {
          settle(resolve, reject, res);
        }, 0);
        return;
      }

      var agree = result.agree;

      if (agree.request.pathToRegexpKeys.length > 0) {
        var pathname = url.parse(axiosRequest.url).pathname;

        var _result = agree.request.pathToRegexp.exec(pathname);

        var values = {};
        agree.request.pathToRegexpKeys.forEach(function (pathKey, index) {
          values[pathKey.name] = _result[index + 1];
        });
        agree.request.values = values;
      }

      if (agree.request.headers && hasTemplate(JSON.stringify(agree.request.headers))) {
        agree.request.values = Object.assign({}, agree.request.values, bind(agree.request.headers, axiosRequest.headers));
      }

      if (agree.request.query && hasTemplate(JSON.stringify(agree.request.query))) {
        agree.request.values = Object.assign({}, agree.request.values, bind(agree.request.query, axiosRequest.query));
      }

      if (agree.request.body && hasTemplate(JSON.stringify(agree.request.body))) {
        agree.request.values = Object.assign({}, agree.request.values, bind(agree.request.body, axiosRequest.body));
      }

      var messageBody = agree.response.body || '';

      if (agree.request.values) {
        messageBody = format(messageBody, agree.request.values, agree.response.funcs);
      }

      if (agree.response.values) {
        messageBody = format(messageBody, Object.assign({}, agree.response.values, agree.request.values), agree.response.funcs);
      }

      if (isContentJSON(agree.response)) {
        messageBody = JSON.stringify(messageBody);
      }

      var headers = {};
      Object.keys(agree.response.headers).forEach(function (header) {
        headers[header] = format(agree.response.headers[header], Object.assign({}, agree.response.values || {}, agree.request.values || {}), agree.response.funcs);
      });
      res.data = messageBody;
      res.statusCode = agree.response.status;
      res.status = agree.response.status;
      res.statusText = '';
      res.headers = headers;
      res.config = config;
      res.request = config;
      setTimeout(function () {
        settle(resolve, reject, res);
      }, 0);
    });
  };
};

