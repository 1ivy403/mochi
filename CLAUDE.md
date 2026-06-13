# CLAUDE.md — Mochi 情绪小兽 · 开发交接

> 给接手开发的 Claude Code 的总纲。**先读完本文件再动手。** 目标读者是 AI 工程师；产品负责人是技术小白，沟通请用通俗语言、少堆术语。
>
> 📖 **本文件只是导航；产品需求的权威完整原稿是 `docs/产品文档/原始文档PDF/`（见 §8）。实现任何功能前，请完整通读相关 PDF 全文——不要只依赖本文件或 `.md` 转录里的速览摘要。**

---

## 1. 这是什么

**Mochi（情绪小兽，形象是一只水母🪼）= 住在桌面角落的 AI 情绪陪伴宠物**，不是工具 / 助手 / 日记本。

**最高准则（soul.md）：「被看见，但不被分析」。** 判断任何设计或 AI 行为对错，只问一句：这让用户觉得**被陪伴**还是**被分析**？被陪伴才做。Mochi 永远不做：主动给建议、评判、追问、把情绪总结成报告、表现得像工具。

> ⚠️ 这个工程是从一个叫 **JellyMate（编码/专注宠物）** 的旧项目改来的。**不要把"专注/任务/编码"那套逻辑带回来。** 残留若有发现，清掉。

---

## 2. 当前状态（截至 2026-06-12）

**UI 空壳 100% 完成，且已套上 Figma「高级治愈系」高保真视觉。全部是假数据，没接任何真功能。**

已完成：
- 桌面透明置顶浮窗 + 水母（浮动、拖拽倾斜物理、眼睛追光标、贴边吸附、点击水母开/关面板）。
- 面板五层结构（顶栏 / 情绪走势图 / 情绪日记栏头 / 内容区 / 底部聊天·日记分段），列表·日历·聊天·设置四视图。
- 情绪走势图（canvas 手绘）、日/周/月卡、周/月明信片"软送达"交互、今日情绪签到卡（空状态引导）。
- 全套视觉已对齐 Figma（薰衣草底、白卡、品牌紫、PingFang 字体、统一设计令牌）。

**未做（= 你的开发任务，见 §7）：** 真 Claude 对话、真情绪卡生成、记忆系统、性格养成、Supabase 存储、明信片定时生成、签到卡空状态判定。当前这些都是**预设回显 / 假数据 / stub**。

---

## 3. 如何运行

```bash
npm install            # 装依赖（Electron 等）
npm start              # = electron . 启动桌面 App（加载 src/index.html）
```

**纯浏览器预览 UI（不依赖 Electron）：**
```bash
npx serve              # 在项目根起静态服务器
# 浏览器打开 http://localhost:<端口>/src/index.html
```
`src/index.html` 里 `window.electronAPI` 不存在时会**降级为空函数**，并加 `body.preview`（浅色底 + 自动展开面板），所以纯浏览器能直接看/测面板 UI。

---

## 4. 关键约束 & 坑（务必遵守）

1. **硬件加速必须开启**：`src/main.js` 第 7 行 `app.disableHardwareAcceleration()` **保持注释**。关掉会 CPU 软渲染整屏 → 严重卡顿。
2. **Claude Code 自己跑不了 Electron**（GPU sandbox 会 crash）。验证 UI 一律用上面的浏览器预览，不要试图 `npm start`。
3. **改完静态文件，serve 有缓存**：刷新页面（或重启 serve）再看，否则看到旧的。
4. **webm 是 VP9 + alpha**：Electron 自带 ffmpeg 偶报 `Unsupported pixel format: -1`，浏览器里正常，可忽略。
5. **`#panel-host` 带 `transform: scale`** → 内部 `position:fixed` 会相对它错位。所以悬浮 tooltip `#ctip`、日历浮窗 `#calPopup` **必须放在 `#panel-host` 之外**（已经这么做了，别挪回去）。
6. **手写体**：曾用 Caveat，但它无中文字形 → 现已全站改 **PingFang SC**。别再引入只含拉丁字母的手写体当中文标题。

---

## 5. 文件地图

```
src/
  index.html   ← ★核心：水母 + 面板 + 全部前端逻辑都在这一个文件（~73KB）
  main.js      ← Electron 主进程：透明置顶全屏窗 + 托盘 + 鼠标穿透 IPC + 32ms 推送光标
  preload.js   ← 暴露 window.electronAPI 给 index.html（IPC 桥）
  mochi.html   ← 开发预览页，保留
assets/        ← 水母 webm（mochi_body 安静蓝 / mochi_happy / mochi_low / mochi_anxious）+ 图标
docs/
  产品文档/     ← ★需求圣经（见 §8）
  交付/figma-handoff.md + 截图/   ← ★视觉交接（设计令牌、红线、10 屏截图）
  specs/        ← 历史设计文档
package.json   ← 依赖与脚本（start / build / test）
tools/shoot.js ← 用本机 Chrome 无头把各状态导出 PNG（node tools/shoot.js）
```

**`src/index.html` 就是整个前端。** 接真功能基本都在这里改（或按需拆分模块）。

---

## 6. 架构与关键约定（都在 src/index.html）

- **单一数据源 `DIARY = {days, weeks, months}`**：列表 / 日历 / 走势图全部由它派生，三视图永远一致。**接真数据只需替换 `DIARY` 这一个源**（及其派生函数）。
- **情绪四色（全局唯一一套）** `EMO_COLOR = {calm:#2a9868, happy:#c08808, anxious:#c83050, low:#5858b8}`（平静薄荷绿 / 开心琥珀黄 / 焦虑玫瑰粉 / 低落雾紫）。走势图点色 `emoC` 复用同一套。
- **设计令牌**：`:root` 里的 `--mc-*`（薰衣草底、品牌紫渐变 `--mc-p1/#4848a0`→`--mc-p2/#6060b8`、文字 `--mc-ink*`、表面 `--mc-surface*`、描边 `--mc-border*`）。改配色优先改这里。
- **明信片软送达模型**：后端定时生成完成后**只调一个入口 `notifyPostcardReady()`**——面板开着→直接推当前窗口；关着→`postcardPending` 排队，下次打开软送。已读防重推用 `localStorage['mochi_pc_seen']`（推过一次聊天 或 看过日记，任一即"翻篇"，跨会话不再推）；**接 Supabase 后把这套已读状态挪到云端**。
- **水母身体**永远"安静蓝"（`refreshPresence()` 只 `setBody('calm')`）；happy/low webm 暂不用，将来由**真实情绪数据**驱动颜色。
- **顶栏**：`↙ 复位` + `⚙ 设置`（⚙ 是开关，再点返回；设置页底部还有小"‹ 返回"）。
- 聊天气泡：Mochi 气泡带 CSS 生成的小水母头像（`::before`），无时间戳。

---

## 7. 开发路线图（按建议顺序，每条指向产品文档）

> 用户填**自己的 Claude API Key**；后端调用也用这个 Key。

1. **API Key 存储**（设置页入口已就位，`saveSettings()` 现在是 stub）→ 接 Supabase（或先加密本地），跨设备同步。**这是其它真功能的前置。**
2. **真 Claude 对话**（替换聊天里的预设回显）。回复规范见 `conversation.md`：共情优先、不建议、不追问、1-2 句、不打扰。每次调用固定拼**四层 Prompt**：系统人格 + 长期记忆 + 中期情绪摘要 + 最近 10 条对话（主文档/overview）。
3. **真情绪卡生成**（✦ 按钮现在走脚本 `genCardScript` 出预设卡）→ 检索当天真实对话 → 生成日卡 → 软推送进聊天 + 日记未读点。规则见 `triggers.md` / 主文档 5.3。生成后 Mochi 主动冒泡邀请深聊（占位文案在 `genCardScript` 里，接入后由 模型+记忆+性格 实时生成）。
4. **今日情绪签到卡**（`updateCheckIn` / `checkInPick`）：现在用"chatMsgs 是否有气泡"近似判断空状态，点击开场白是占位 → 接"当天是否真有对话"判定 + 按所选情绪由模型开场。
5. **记忆系统**：写入只用 `save_memory(type, content)` 工具；读取靠 AI 自由判断 + 信号词兜底（又/还是/终于/一直/从来/以前）；**情绪记忆优先于事实记忆**；每周中期记忆压缩。见 `memory.md`。
6. **性格养成系统**：见 `evolution.md`。
7. **周/月明信片定时生成**（交互层已完成）：后端 cron（周日/月底）生成后调 `notifyPostcardReady()` 即可。叙事写作规范见 `narrative.md`（周记100-200字、月故事400-600字，字数弹性、宁短勿凑）。
8. **真数据接入**：把假的 `DIARY` 换成真实情绪卡数据。

---

## 8. 产品文档（docs/产品文档/）

> ⚠️ **以原始 PDF 为准，开发前请完整通读相关全文，不要只看本文件或 `.md` 的摘要。**
> `docs/产品文档/原始文档PDF/` 是**权威完整原稿**；同目录的 `.md` 只是早期**精简转录**（明显更短，可能遗漏细节），仅供快速检索定位，**真正实现时读 PDF 全文**。本 CLAUDE.md 第 1/6/7 节里对产品规则的描述也都是导航性速览，同样以 PDF 原文为准。

权威原稿：`docs/产品文档/原始文档PDF/`
| PDF | 内容 |
|---|---|
| `情绪小兽 (4).pdf` | **主文档/总纲**（定位、5.x 功能、卡片生成规则、MVP、Supabase 表结构等，最全） |
| `soul.md.pdf` | **灵魂·最高准则**（被陪伴 not 被分析）——任何取舍先回这 |
| `conversation.md.pdf` | 对话规范（共情、不建议、不追问、启动三态） |
| `narrative.md.pdf` | 情绪叙事（日卡/周记/月故事写作规范、字数弹性、软送达） |
| `memory.md.pdf` | 记忆系统（save_memory、信号词、情绪记忆优先） |
| `evolution.md.pdf` | 性格养成 |
| `triggers.md.pdf` | 事件→动作总表（对话/启动/状态/卡片/记忆触发） |
| `interaction.pdf` | 面板交互细节（双视图、悬停浮窗、排序、缩放、弹出方向） |

> 读 PDF：用 Read 工具的 `pages` 参数分页读，或先转文本（如 `pdftotext`）。`.md` 转录版可作目录速览，但**遇到任何细节差异以 PDF 为准**。

## 9. 视觉交接（docs/交付/）

- `figma-handoff.md`：设计令牌表、红线规则、评审决定、各屏说明。
- `截图/01~10`：当前实现的 10 屏参考图（改界面后 `node tools/shoot.js` 重出）。
- Figma 源（高级治愈系）：用户处的 `/design/` 文件。

---

## 10. 打包给开发时包含 / 排除

**包含**：`src/`、`assets/`、`docs/`、`package.json`、`package-lock.json`、`CLAUDE.md`、`tools/`、`.gitignore`。
**排除（体积大/可重建）**：`node_modules/`（开发方 `npm install` 即可）、`dist/`（旧构建产物）、所有 `.DS_Store`。
