const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const EventEmitter = require('events')

// Mock child_process.spawn before requiring the module
let spawnArgs = null
const mockProc = new EventEmitter()
mockProc.stdout = new EventEmitter()
mockProc.stderr = new EventEmitter()
mockProc.kill = () => {}

const cp = require('child_process')
cp.spawn = (...args) => { spawnArgs = args; return mockProc }

const { runClaude, isClaudeInstalled } = require('../../src/lib/claude-runner')

describe('claude-runner', () => {
  it('runClaude spawns claude with correct args and cwd', () => {
    spawnArgs = null
    runClaude('/tmp/test-project', 'build a todo app', () => {})
    assert.equal(spawnArgs[0], 'claude')
    assert.ok(spawnArgs[1].includes('--dangerously-skip-permissions'))
    assert.equal(spawnArgs[2].cwd, '/tmp/test-project')
  })

  it('runClaude calls onUpdate with stdout lines', (_, done) => {
    const updates = []
    runClaude('/tmp/test', 'prompt', (line) => {
      updates.push(line)
      if (updates.length === 1) {
        assert.equal(updates[0], 'Building...')
        done()
      }
    })
    mockProc.stdout.emit('data', Buffer.from('Building...\n'))
  })
})
