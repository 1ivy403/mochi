const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')

// Override LAB_DIR to a temp dir for tests
process.env.JELLYMATE_LAB = path.join(os.tmpdir(), 'jellymate-test-' + Date.now())

const {
  ensureLabDir, createTask, writeProjectFiles, updateProgress,
  readProgress, getAllTasks
} = require('../../src/lib/task-manager')

describe('task-manager', () => {
  before(() => ensureLabDir())
  after(() => fs.rmSync(process.env.JELLYMATE_LAB, { recursive: true, force: true }))

  it('ensureLabDir creates the lab directory', () => {
    assert.ok(fs.existsSync(process.env.JELLYMATE_LAB))
  })

  it('createTask returns task with id, slug, projectDir', () => {
    const task = createTask('build a todo app', 'todo-app', '2026-05-30')
    assert.ok(task.task_id)
    assert.equal(task.slug, 'todo-app')
    assert.ok(task.projectDir.includes('2026-05-30-todo-app'))
    assert.ok(fs.existsSync(task.projectDir))
  })

  it('writeProjectFiles creates all required files', () => {
    const task = createTask('build a chat app', 'chat-app', '2026-05-30')
    const data = {
      exploration: 'Test exploration.',
      reason_summary: 'Test reason.',
      requirements: ['req 1'],
      implementation_steps: ['step 1'],
      tech_stack: 'HTML/JS',
      acceptance_criteria: ['works']
    }
    writeProjectFiles(task, 'build a chat app', data)
    const files = ['idea.md', 'exploration.md', 'requirements.md',
                   'implementation-plan.md', 'agent-prompt.md', 'progress.json']
    files.forEach(f => assert.ok(fs.existsSync(path.join(task.projectDir, f)), `missing ${f}`))
  })

  it('updateProgress and readProgress round-trip', () => {
    const task = createTask('test task', 'test-task', '2026-05-30')
    writeProjectFiles(task, 'test task', {
      exploration: 'x', reason_summary: 'y',
      requirements: [], implementation_steps: [],
      tech_stack: 'x', acceptance_criteria: []
    })
    updateProgress(task.projectDir, { state: 'coding', current_action: 'writing index.html' })
    const p = readProgress(task.projectDir)
    assert.equal(p.state, 'coding')
    assert.equal(p.current_action, 'writing index.html')
  })

  it('getAllTasks returns tasks from index', () => {
    const tasks = getAllTasks()
    assert.ok(Array.isArray(tasks))
    assert.ok(tasks.length >= 1)
  })
})
