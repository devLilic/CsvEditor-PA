// electron/main/index.ts
import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { registerUpdateHandlers } from './update-service'
import { registerCsvHandlers } from './csv-handlers'
import { registerCsvProjectHandlers } from './csv-project-handlers'
import { registerSettingsHandlers } from './settings-handlers'
import { registerPhoneImageHandlers } from './phone-image-handlers'
import { registerTemplateEditorHandlers } from './template-editor-handlers'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')
const SPELLCHECK_LANGUAGES = ['ro']

function getWindowTitle() {
  return `AZ Editor (ver. ${app.getVersion()})`
}

function lockWindowTitle(window: BrowserWindow) {
  window.setTitle(getWindowTitle())
  window.on('page-title-updated', (event) => {
    event.preventDefault()
    window.setTitle(getWindowTitle())
  })
}

function sendMenuNavigate(window: BrowserWindow, route: string) {
  window.webContents.send(IPC_CHANNELS.APP_MENU_NAVIGATE, route)
}

function createAppMenu(window: BrowserWindow) {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Setări',
      submenu: [
        {
          label: 'Setări proiect nou',
          click: () => sendMenuNavigate(window, '/settings/default-project'),
        },
      ],
    },
    {
      label: 'Vizualizare',
      submenu: [
        { role: 'resetZoom', label: 'Resetare zoom' },
        { role: 'zoomIn', label: 'Mărește zoom' },
        { role: 'zoomOut', label: 'Micșorează zoom' },
      ],
    },
  ])

  Menu.setApplicationMenu(menu)
  window.setMenu(menu)
  window.setMenuBarVisibility(true)
}

function configureSpellChecker(window: BrowserWindow) {
  const { session } = window.webContents
  const languages = SPELLCHECK_LANGUAGES.filter((language) =>
    session.availableSpellCheckerLanguages.includes(language),
  )

  if (languages.length > 0) {
    session.setSpellCheckerLanguages(languages)
  }
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    title: getWindowTitle(),
    fullscreenable: true,
    autoHideMenuBar: false,
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      nodeIntegration: false,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      contextIsolation: true,
      spellcheck: true,
    },
  })

  lockWindowTitle(win)
  configureSpellChecker(win)
  createAppMenu(win)

  win.once('ready-to-show', () => {
    win?.maximize()
    win?.show()
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    // win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // ✅ AICI ESTE LOCUL CORECT
  // =========================
  registerCsvHandlers(win)
  registerCsvProjectHandlers(win)
  registerSettingsHandlers()
  registerPhoneImageHandlers()
  registerTemplateEditorHandlers()
  // =========================

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  registerUpdateHandlers(win)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {

    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    title: getWindowTitle(),
    autoHideMenuBar: true,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
    },
  })

  lockWindowTitle(childWindow)
  configureSpellChecker(childWindow)
  createAppMenu(childWindow)

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})


// Optional: basic global error logging
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error)
})
