// electron/preload/index.ts
import { contextBridge } from 'electron'
import { electronApi } from './api'
import type { RendererApi } from '../../src/shared/ipc-types'

contextBridge.exposeInMainWorld('electronAPI', electronApi)

declare global {
  interface Window {
    electronAPI: RendererApi
  }
}
