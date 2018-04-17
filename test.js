const agrios = require('./index')
const axios = require('axios')
const assert = require('assert')

const agrees = [
  {
    request: {
      path: '/users/:id',
      method: 'GET'
    },
    response: {
      body: {
        user_id: '{:id}'
      }
    }
  },
  {
    request: {
      path: '/echo',
      method: 'POST',
      body: {
        key: '{:value}'
      }
    },
    response: {
      body: {
        key: '{:value}'
      }
    }
  },
  {
    request: { path: '/show-token', headers: { 'X-Auth-Token': '{:token}' } },
    response: { body: { token: '{:token}' } }
  }
]

describe('agrios', () => {
  it('returns a response from agrees', async () => {
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
