# Mochi 情绪小兽 🪼

**住在桌面角落的 AI 情绪陪伴小兽 —— 安静、不打扰、被陪伴而非被分析。**

形象是一只水母，浮在屏幕边缘。点它弹出聊天 + 情绪日记面板；它陪你随手记录情绪，并在合适的时间把碎片还原成"让你认出自己的故事"。

> 桌面端 Electron（macOS）。当前为**高保真 UI 空壳**（假数据），真功能（Claude 对话 / 记忆 / 情绪卡生成 / Supabase）待开发。

## 开发者从这里开始

👉 **先读 [`CLAUDE.md`](CLAUDE.md)** —— 完整开发交接：现状、如何运行、关键约束、文件地图、架构约定、开发路线图、文档索引。

```bash
npm install
npm start          # Electron 桌面 App
# 或纯浏览器预览 UI：npx serve 后打开 http://localhost:<端口>/src/index.html
```

## 目录

- `src/index.html` — 核心：水母 + 面板 + 全部前端逻辑
- `src/main.js` / `src/preload.js` — Electron 壳
- `docs/产品文档/` — 需求圣经（灵魂、对话、叙事、记忆、交互…）
- `docs/交付/` — Figma 视觉交接（设计令牌 + 截图）

## 灵魂

判断任何设计/AI 行为，只问一句：让用户觉得**被陪伴**还是**被分析**？被陪伴才做。详见 [`docs/产品文档/soul.md`](docs/产品文档/soul.md)。

## License

MIT
