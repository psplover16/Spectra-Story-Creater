import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { access, constants } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildDefaultDeps, resolveCliPath } from './ai/cliPathResolver'
import { invokeCli } from './ai/cliInvoker'
import { registerAiHandlers } from './ipc/aiHandlers'
import { registerCharacterHandlers } from './ipc/characterHandlers'
import { registerChapterHandlers } from './ipc/chapterHandlers'
import { registerEquipmentHandlers } from './ipc/equipmentHandlers'
import { registerExportHandlers } from './ipc/exportHandlers'
import { registerFactionHandlers } from './ipc/factionHandlers'
import { registerNovelHandlers } from './ipc/novelHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { registerWorkspaceHandlers } from './ipc/workspaceHandlers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DIST = path.join(__dirname, '../dist')
const DIST_ELECTRON = __dirname
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let mainWindow: BrowserWindow | null = null

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Spectra 小說創作助手',
    webPreferences: {
      preload: path.join(DIST_ELECTRON, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'right' })
  } else {
    void mainWindow.loadFile(path.join(DIST, 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerDialogHandlers(): void {
  ipcMain.handle('workspace:pickFolder', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '選擇 workspace 資料夾',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('workspace:isWritable', async (_event, target: string) => {
    try {
      await access(target, constants.W_OK)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('ping', () => 'pong')
}

function registerAllHandlers(): void {
  const cliPathResolverDeps = buildDefaultDeps(() => app.getPath('userData'))
  registerDialogHandlers()
  registerWorkspaceHandlers(ipcMain)
  registerNovelHandlers(ipcMain)
  registerCharacterHandlers(ipcMain)
  registerChapterHandlers(ipcMain)
  registerFactionHandlers(ipcMain)
  registerEquipmentHandlers(ipcMain)
  registerExportHandlers(ipcMain)
  registerSettingsHandlers(ipcMain, {
    cliSettingsPath: () => path.join(app.getPath('userData'), 'cli.json'),
  })
  registerAiHandlers(ipcMain, {
    invoke: (source, input) =>
      invokeCli(source, input, {
        getCliPath: (s) => resolveCliPath(s, cliPathResolverDeps),
      }),
  })
}

void app.whenReady().then(() => {
  registerAllHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
