'use strict';
const { JSDOM } = require('jsdom');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf-8');

// ── 测试环境 ──
function createApp({ lsData = {} } = {}) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost',
    beforeParse(win) {
      win.requestAnimationFrame = (cb) => win.setTimeout(cb, 16);
      win.cancelAnimationFrame = (id) => win.clearTimeout(id);
      win.electronAPI = {
        mouseEnterJelly: () => {},
        mouseLeaveJelly: () => {},
        dragMove: () => {},
        setPosition: () => {},
        panelOpen: () => {},
        panelClose: () => {},
        onCursorPos: () => {},
      };
      for (const [k, v] of Object.entries(lsData)) {
        win.localStorage.setItem(k, v);
      }
    },
  });
  return { win: dom.window, doc: dom.window.document };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 测试运行器 ──
let passed = 0, failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗  ${name}`);
    console.log(`     └ ${e.message}`);
    failed++;
  }
}

(async () => {
  // ══ 1. 面板已移除 ══
  console.log('\n【面板移除】');

  await test('#panel 元素不存在', () => {
    const { doc } = createApp();
    assert.strictEqual(doc.getElementById('panel'), null);
  });

  await test('面板按钮（btn-dismiss / btn-fade / btn-focus / btn-tutorial）均不存在', () => {
    const { doc } = createApp();
    ['btn-dismiss', 'btn-fade', 'btn-focus', 'btn-tutorial', 'btn-close-panel'].forEach((id) => {
      assert.strictEqual(doc.getElementById(id), null, `${id} 仍然存在`);
    });
  });

  // ══ 2. 引导内容 ══
  console.log('\n【引导卡内容】');

  await test('旧文案"打开更多选项面板"已删除', () => {
    assert.ok(!html.includes('打开更多选项面板'), 'HTML 仍含旧面板文案');
  });

  await test('长按步骤说明含"退下"', () => {
    assert.ok(html.includes('我会暂时退下'), '长按步骤未更新为退下说明');
  });

  await test('最后一步含二次拖边说明', () => {
    assert.ok(html.includes('拖到边缘两次也可以退下'), '最后步骤文案缺失');
  });

  await test('endTutorial 完成路径写入 localStorage', () => {
    assert.ok(
      html.includes("localStorage.setItem(TUT_DONE_KEY,'1')"),
      '缺少 localStorage 写入逻辑'
    );
  });

  // ══ 3. 首次 / 再次启动 ══
  console.log('\n【启动行为】');

  await test('首次启动：引导卡初始不可见', () => {
    const { doc } = createApp();
    assert.ok(!doc.getElementById('tut-card').classList.contains('show'));
  });

  await test('首次启动：800ms 后引导卡自动显示', async () => {
    const { doc } = createApp();
    await wait(1000);
    assert.ok(
      doc.getElementById('tut-card').classList.contains('show'),
      '引导卡未在 800ms 后自动显示'
    );
  });

  await test('再次启动（localStorage 已有记录）：引导卡不显示', async () => {
    const { doc } = createApp({ lsData: { mochi_tut_done: '1' } });
    await wait(1000);
    assert.ok(
      !doc.getElementById('tut-card').classList.contains('show'),
      '已完成引导仍弹出了引导卡'
    );
  });

  // ══ 4. 跳过引导 ══
  console.log('\n【跳过引导】');

  await test('点跳过：localStorage 不写入，引导卡关闭', async () => {
    const { doc, win } = createApp();
    await wait(1000);
    doc.getElementById('tut-skip-btn').click();
    assert.strictEqual(
      win.localStorage.getItem('mochi_tut_done'),
      null,
      '点跳过不应写入 localStorage'
    );
    assert.ok(
      !doc.getElementById('tut-card').classList.contains('show'),
      '引导卡应已关闭'
    );
  });

  // ══ 5. 长按退下 ══
  console.log('\n【长按退下】');

  await test('长按 750ms → recall-edge 出现（dismiss 触发）', async () => {
    const { doc, win } = createApp({ lsData: { mochi_tut_done: '1' } });
    await wait(200);
    const wrap = doc.getElementById('jelly-wrap');
    const recallEdge = doc.getElementById('recall-edge');
    assert.ok(!recallEdge.classList.contains('show'), '初始 recall-edge 不应可见');
    wrap.dispatchEvent(
      new win.MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100, bubbles: true })
    );
    await wait(900);
    assert.ok(recallEdge.classList.contains('show'), '长按后 recall-edge 应显示');
  });

  // ══ 6. 贴边倾斜 CSS ══
  console.log('\n【贴边倾斜 CSS】');

  await test('edge-right / edge-left / edge-bottom CSS 类已定义', () => {
    assert.ok(html.includes('.edge-right'), '缺少 .edge-right');
    assert.ok(html.includes('.edge-left'), '缺少 .edge-left');
    assert.ok(html.includes('.edge-bottom'), '缺少 .edge-bottom');
  });

  await test('#jelly-wrap transition 包含 transform', () => {
    assert.ok(html.includes('transform 1.2s'), '#jelly-wrap 缺少 transform 过渡');
  });

  // ══ 汇总 ══
  const total = passed + failed;
  console.log(`\n${'─'.repeat(36)}`);
  console.log(`  共 ${total} 个，通过 ${passed}，失败 ${failed}`);
  console.log(`${'─'.repeat(36)}\n`);
  if (failed > 0) process.exit(1);
})().catch((e) => {
  console.error('\n测试运行器异常：', e);
  process.exit(1);
});
