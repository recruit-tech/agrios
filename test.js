const agrios = require('./index')
const axios = require('axios')
const assert = require('assert')

const agrees = [
  {
    request: { path: '/hello' },
    response: { headers: { 'Content-Type': 'text/plain' } }
  },
  {
    request: { path: '/users/:id' },
    response: { body: { user_id: '{:id}' } }
  },
  {
    request: { path: '/echo', method: 'POST', body: { key: '{:value}' } },
    response: { body: { key: '{:value}' } }
  },
  {
    request: { path: '/show-token', headers: { 'X-Auth-Token': '{:token}' } },
    response: { body: { token: '{:token}' } }
  },
  {
    request: { path: '/query', query: { date: '{:date}' } },
    response: { body: { date: '{:date}' } }
  },
  {
    request: { path: '/data' },
    response: { body: { value: '{:foo}' }, values: { foo: 'bar' } }
  },
  {
    request: { path: '/sum', method: 'POST', body: { x: '{:x}', y: '{:y}' } },
    response: { body: { result: '{sum:x,y}' }, funcs: { sum (x, y) { return x + y } } }
  }
]

describe('agrios', () => {
  it('returns a response from agrees', async () => {
    const res = await axios.get('/hello', { adapter: agrios(agrees) })

    assert.deepStrictEqual(res.status, 200)
  })

  it('returns a response with values defined in path parameter', async () => {
    const res = await axios.get('/users/1', { adapter: agrios(agrees) })

    assert.deepStrictEqual(res.data, { user_id: '1' })
  })

  it('returns a response with values defined in request body', async () => {
    const res = await axios.post('/echo', { key: 'some-value' }, { adapter: agrios(agrees) })

    assert.deepStrictEqual(res.data, { key: 'some-value' })
  })

  it('returns a response with values defined in request header', async () => {
    const res = await axios.get('/show-token', { headers: { 'x-auth-token': 'my-token' }, adapter: agrios(agrees) })

    assert.deepStrictEqual(res.data, { token: 'my-token' })
  })

  it('returns a response with values defined in request query', async () => {
    const res = await axios.get('/query', { params: { date: '2010-10-01' }, adapter: agrios(agrees) })

    assert.deepStrictEqual(res.data, { date: '2010-10-01' })
  })

  it('returns a response with values defined in agreed response value property', async () => {
    const res = await axios.get('/data', { adapter: agrios(agrees) })

    assert.deepStrictEqual(res.data, { value: 'bar' })
  })

  it('returns a response using custom funcions', async () => {
    const res = await axios.post('/sum', { x: 101, y: 38 }, { adapter: agrios(agrees) })

    assert.deepStrictEqual(res.data, { result: 139 })
  })

  context('when the request body is invalid', () => {
    it('throws', async () => {
      try {
        await axios.get('/echo', { data: '{broken-json}', adapter: agrios(agrees) })
      } catch (e) {
        assert(e instanceof Error)
        return
      }

      throw new Error('The error not thrown')
    })
  })

  context('when the request does not match to any agree', () => {
    it('returns a 404 response', async () => {
      try {
        await axios.get('/freights/1', { adapter: agrios(agrees) })
      } catch (e) {
        assert.strictEqual(e.response.status, 404)
        return
      }

      throw new Error('The request does not return 404 response')
    })

    context('but there is a similar agree', () => {
      it('returns a 404 response with similar agree message', async () => {
        try {
          await axios.get('/show-token', { headers: { 'wrong': 'bar' }, adapter: agrios(agrees) })
        } catch (e) {
          assert.strictEqual(e.response.status, 404)
          assert.strictEqual(e.response.data, 'Agree Not Found, actual request is {"url":"/show-token","method":"get","headers":{"Accept":"application/json, text/plain, */*","wrong":"bar"}}, but similar agree request is {"path":"/show-token","headers":{"x-auth-token":"{:token}"},"method":"GET","values":{"token":"my-token"}}, error: Does not include header, expect {"x-auth-token":"{:token}"} but {"Accept":"application/json, text/plain, */*","wrong":"bar"}')
          return
        }

        throw new Error('The request does not return 404 response')
      })
    })
  })
})
