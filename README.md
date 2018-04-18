# Agrios

> :package: Package your agreed server as [axios adapter][]

Agrios packages your `agree` file into [axios adapter][]. If you set it as the `adapter` of axios, then it gets responses from the `agree`s of your agreed files. See below for details.

# Install

    npm install --save-dev agrios

# Usage

First create adapter:

```js
const agrees = require('./path/to/agreed-file')
const agrios = require('agrios')

const agreedAdapter = agrios(agrees)
```

Then set it to your axios:

```js
const axios = require('axios')

axios.default.adapter = agreedAdapter
```

Then your axios calls get responses from the agreed files.

```js
axios.get('path/to/agreed-endpoint', { params: { some_key: 'some_value' } })
```

This doesn't make an acutual API request, but does get the response from the agreed files.

# API

```js
const agrios = require('agrios')
```

## agrios(agrees)

- @param {Object[]} agrees The list of agree objects

Creates the [axios adapter][] from the agreed definition array.

**NOTE**: Each item in `agrees` have to be an object. Unlike `agreed-server`, the string item (path of the agree file) is not supported.

If you have agreed root file like the below:

```js
module.exports = [
  './path/to/agree/foo.js',
  './path/to/agree/bar.js',
  './path/to/agree/baz.js',
  './path/to/agree/qux.js'
]
```

You need to rewrite it to:

```js
module.exports = [
  require('./path/to/agree/foo.js'),
  require('./path/to/agree/bar.js'),
  require('./path/to/agree/baz.js'),
  require('./path/to/agree/qux.js')
]
```

# License

MIT

[Axios adapter]: https://github.com/axios/axios/tree/master/lib/adapters
