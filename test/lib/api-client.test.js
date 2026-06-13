const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

// Patch global fetch before requiring the module
let fetchCalls = []
global.fetch = async (url, opts) => {
  fetchCalls.push({ url, opts })
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({
        title: 'Test App',
        slug: 'test-app',
        exploration: 'Test exploration.',
        reason_summary: 'Test reason.',
        requirements: ['req 1'],
        implementation_steps: ['step 1'],
        tech_stack: 'HTML/CSS/JS',
        acceptance_criteria: ['works']
      }) } }]
    })
  }
}

const { expandIdea, verifyApiKey } = require('../../src/lib/api-client')

describe('api-client', () => {
  it('expandIdea calls DeepSeek with correct headers', async () => {
    fetchCalls = []
    await expandIdea('build a todo app', 'sk-test')
    assert.equal(fetchCalls.length, 1)
    assert.ok(fetchCalls[0].url.includes('deepseek.com'))
    assert.ok(fetchCalls[0].opts.headers['Authorization'].includes('sk-test'))
  })

  it('expandIdea returns structured object', async () => {
    fetchCalls = []
    const result = await expandIdea('build a todo app', 'sk-test')
    assert.equal(result.title, 'Test App')
    assert.equal(result.slug, 'test-app')
    assert.ok(Array.isArray(result.requirements))
  })

  it('verifyApiKey returns true on ok response', async () => {
    global.fetch = async () => ({ ok: true })
    const ok = await verifyApiKey('sk-test')
    assert.equal(ok, true)
  })

  it('verifyApiKey returns false on failed response', async () => {
    global.fetch = async () => ({ ok: false, status: 401 })
    const ok = await verifyApiKey('sk-bad')
    assert.equal(ok, false)
  })
})
