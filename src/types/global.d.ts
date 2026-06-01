// src/types/global.d.ts
import type { RendererApi } from '../shared/ipc-types'

declare global {
    interface Window {
        electronAPI: RendererApi
    }
}

export {}
