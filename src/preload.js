const { contextBridge, ipcRenderer, shell } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ── 水母交互 + 鼠标穿透 ──
  mouseEnterJelly: ()       => ipcRenderer.send('mouse-enter-jelly'),
  mouseLeaveJelly: ()       => ipcRenderer.send('mouse-leave-jelly'),
  dragMove:        (dx, dy) => ipcRenderer.send('drag-move', { dx, dy }),
  setPosition:     (x, y)   => ipcRenderer.send('set-position', { x, y }),
  // ── 面板开关（点击水母弹出/收起面板）──
  panelOpen:       ()       => ipcRenderer.send('panel-open'),
  panelClose:      ()       => ipcRenderer.send('panel-close'),
  // 鼠标动态穿透：在水母/面板范围内则可交互，出去则穿透
  hitInteractive:  ()       => ipcRenderer.send('hit-interactive'),
  hitPassthrough:  ()       => ipcRenderer.send('hit-passthrough'),
  // ── 光标位置（主进程每 32ms 推送，用于眼球追踪）──
  onCursorPos:     (cb)     => ipcRenderer.on('cursor-pos', (_, x, y) => cb(x, y)),
  // ── 外部链接 ──
  openExternal:    (url)    => shell.openExternal(url),
  // ── 设备码（持久化到 userData，不受 localStorage 清除影响）──
  getDeviceId:     ()       => ipcRenderer.invoke('get-device-id'),
})
