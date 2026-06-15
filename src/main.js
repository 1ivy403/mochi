const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs   = require('fs')
const crypto = require('crypto')

// 硬件加速：开启 → GPU 负责合成，全屏透明窗口 + 持续动画才不掉帧。
// 之前为「透明更稳」关掉过，但代价是 CPU 软件渲染整屏 → 严重卡顿。
// 若开启后水母变黑底（macOS 个别情况），把下面这行取消注释回退到软件渲染：
// app.disableHardwareAcceleration()

let win  = null
let tray = null

// ── 设备码：写在 userData 目录，重装 App 不会清除 ──
function getDeviceId() {
  const file = path.join(app.getPath('userData'), 'device_id')
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim()
  } catch (_) {}
  const id = crypto.randomUUID()
  try { fs.writeFileSync(file, id, 'utf8') } catch (_) {}
  return id
}

let win  = null
let tray = null

function createWindow() {
  const { bounds } = screen.getPrimaryDisplay()

  win = new BrowserWindow({
    width:  bounds.width,
    height: bounds.height,
    x: 0, y: 0,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  win.setIgnoreMouseEvents(true, { forward: true })
  win.loadFile(path.join(__dirname, 'index.html'))

  win.webContents.on('did-finish-load', () => {
    setInterval(() => {
      if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return
      try {
        const { x, y } = screen.getCursorScreenPoint()
        win.webContents.send('cursor-pos', x, y)
      } catch (_) {}
    }, 32)
  })
}

// ── 菜单栏托盘（情绪小兽入口）──
function createTray() {
  const iconPath = path.join(__dirname, '../assets/icon-1024.png')
  const img = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 })
  img.setTemplateImage(true)
  tray = new Tray(img)
  tray.setToolTip('Mochi 🪼')
  const menu = Menu.buildFromTemplate([
    { label: 'Mochi 🪼', enabled: false },
    { type: 'separator' },
    { label: '显示 Mochi', click: () => win?.show() },
    { label: '隐藏 Mochi', click: () => win?.hide() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
}

// ── IPC：设备码 ──
ipcMain.handle('get-device-id', () => getDeviceId())

// ── IPC：鼠标穿透控制 ──
ipcMain.on('mouse-enter-jelly', () => {
  win?.setIgnoreMouseEvents(false)
  win?.setFocusable(true)
})
ipcMain.on('mouse-leave-jelly', () => {
  win?.setIgnoreMouseEvents(true, { forward: true })
  win?.setFocusable(false)
})
ipcMain.on('drag-move', (_, { dx, dy }) => {
  if (!win) return
  const [x, y] = win.getPosition()
  win.setPosition(x + dx, y + dy)
})
ipcMain.on('set-position', (_, { x, y }) => {
  win?.setPosition(Math.round(x), Math.round(y))
})
// 面板开关
ipcMain.on('panel-open',  () => { win?.setIgnoreMouseEvents(false); win?.setFocusable(true) })
ipcMain.on('panel-close', () => { win?.setIgnoreMouseEvents(true, { forward: true }); win?.setFocusable(false) })
// 鼠标在面板/水母区域内外动态切换穿透：在则可点，出则穿透
ipcMain.on('hit-interactive', () => { win?.setIgnoreMouseEvents(false); win?.setFocusable(true) })
ipcMain.on('hit-passthrough', () => { win?.setIgnoreMouseEvents(true, { forward: true }); win?.setFocusable(false) })

app.whenReady().then(() => {
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
