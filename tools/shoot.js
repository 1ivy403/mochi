// 用已装的 Google Chrome（无头）把 index.html 的各状态导出成 PNG，存到 docs/交付/截图/
// 运行： node tools/shoot.js
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PAGE = 'file://' + path.resolve(__dirname, '../src/index.html');
const OUT = path.resolve(__dirname, '../docs/交付/截图');
fs.mkdirSync(OUT, { recursive: true });

const wait = ms => new Promise(r => setTimeout(r, ms));

// 每个状态：名字 + 一段在页面里执行的布置代码
const STATES = [
  ['01-聊天默认', () => {
    postcardDelivered = true;
    document.querySelectorAll('#chatMsgs .chat-card,#listView .pinned-postcard').forEach(e => e.remove());
    switchMainTab('chat');
  }],
  ['02-聊天-情绪卡', () => {
    switchMainTab('chat');
    const msgs = document.getElementById('chatMsgs');
    msgs.querySelectorAll('.chat-card,.gen-thinking').forEach(e => e.remove());
    const card = document.createElement('div');
    card.className = 'chat-card reveal';
    card.innerHTML = '<div class="cc-glow"></div>' +
      '<div class="cc-head"><span class="cc-emo">焦虑</span><span class="cc-date">6月2日 · 周一</span></div>' +
      '<div class="cc-text">走出会议室，外面的光有点刺眼。</div>' +
      '<div class="cc-mochi">🪼 已经替你收进日记了。</div>';
    msgs.appendChild(card);
    const ask = document.createElement('div'); ask.className = 'msg mochi';
    ask.textContent = '今天好像绷了一整天，想跟我说说吗？';
    msgs.appendChild(ask);
  }],
  ['03-聊天-明信片收起', () => {
    switchMainTab('chat');
    const msgs = document.getElementById('chatMsgs');
    msgs.querySelectorAll('.chat-card').forEach(e => e.remove());
    document.querySelectorAll('#listView .pinned-postcard').forEach(e => e.remove());
    const w = DIARY.weeks[DIARY.weeks.length - 1];
    w.story = '这一周，我好像一直在等什么事情结束。周一的会议、周三的截止日期、周五下班前的那条消息——每一件事都压着，但没有一件真正过去。直到周六早上睡到自然醒，才想起来，原来我也会有这样的时刻。';
    postcardDelivered = false; localStorage.removeItem('mochi_pc_seen');
    deliverPostcard();
  }],
  ['04-聊天-明信片展开', () => {
    const b = document.querySelector('#chatMsgs .chat-card.postcard .story-more');
    if (b) b.click();
  }],
  ['05-日记-列表上半', () => {
    switchMainTab('diary'); setView('list');
    document.getElementById('listView').scrollTop = 0;
  }],
  ['06-日记-月卡', () => {
    switchMainTab('diary'); setView('list');
    const l = document.getElementById('listView'); l.scrollTop = l.scrollHeight;
  }],
  ['07-日记-时间线排序', () => {
    switchMainTab('diary'); setView('list');
    if (!sorted) toggleSort();
    document.getElementById('listView').scrollTop = 0;
  }],
  ['08-日记-日历', () => {
    if (sorted) toggleSort();
    switchMainTab('diary'); setView('cal'); renderCal(2025, 5);
  }],
  ['09-走势图-月', () => {
    switchMainTab('diary'); setView('list'); setTab('month');
    document.getElementById('listView').scrollTop = 0;
  }],
  ['10-设置', () => { setTab('week'); openSettings(); }],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=2'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 520, height: 900, deviceScaleFactor: 2 });
  await page.goto(PAGE, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await wait(1200); // 等字体/视频/自动展开

  const PAD = 18; // 面板四周留白
  for (const [name, setup] of STATES) {
    await page.evaluate(setup);
    await wait(500);
    // 精确裁到面板本身（含 transform:scale），四周留点白边
    const box = await page.evaluate((pad) => {
      const el = document.getElementById('panel-host') || document.querySelector('.panel');
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, r.left - pad), y: Math.max(0, r.top - pad),
               w: r.width + pad * 2, h: r.height + pad * 2 };
    }, PAD);
    const file = path.join(OUT, name + '.png');
    await page.screenshot({ path: file, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
    console.log('✓', name + '.png');
  }
  await browser.close();
  console.log('\n全部导出到：', OUT);
})();
