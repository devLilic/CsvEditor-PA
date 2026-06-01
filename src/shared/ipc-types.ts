// src/shared/ipc-types.ts
import { IPC_CHANNELS } from './ipc-channels'
import type { DefaultProjectSettings } from '../features/csv-editor/domain/defaultProjectSettings'
import type { PhoneImageSettings } from '../features/csv-editor/domain/phoneImageSettings'
import type { CsvFileSettings } from '../features/csv-editor/domain/csvFileSettings'
import type { TemplateDocument } from '../features/template-editor/domain/templateDocument'

export interface CsvFileDescriptor {
    path: string
    content: string
}

export interface CsvGetWorkingResponse {
    ok: boolean
    path?: string
    filename?: string
    content?: string
    error?: string
}

export interface CsvWriteResponse {
    ok: boolean
    error?: string
}

export interface CsvBackupResponse {
    ok: boolean
    error?: string
    backupPath?: string
}

export interface CsvCreateBackupRequest {
    content: string
}

export interface CsvCreateBackupResponse {
    ok: boolean
    backupPath?: string
    filename?: string
    error?: string
}

export interface CsvProjectFileInfo {
    filename: string
    fullPath: string
    mtimeMs: number
}

export interface CsvProjectListResponse {
    ok: boolean
    files: CsvProjectFileInfo[]
    error?: string
}

export interface CsvProjectSaveAsRequest {
    filename: string
    content: string
}

export interface CsvProjectSaveAsResponse {
    ok: boolean
    filename?: string
    fullPath?: string
    error?: string
}

export interface CsvProjectLoadIntoWorkingRequest {
    filename: string
}

export interface CsvProjectLoadIntoWorkingResponse {
    ok: boolean
    content?: string
    error?: string
}

export interface CsvProjectDeleteRequest {
    filename: string
}

export interface CsvProjectDeleteResponse {
    ok: boolean
    error?: string
}

export type AppConfig = Record<string, unknown>

export type UpdateStatus =
    | { type: 'idle'; currentVersion: string }
    | { type: 'checking'; currentVersion: string }
    | { type: 'available'; currentVersion: string; newVersion: string; releaseNotes?: string }
    | { type: 'not-available'; currentVersion: string }
    | { type: 'downloading'; percent: number; transferred?: number; total?: number }
    | { type: 'downloaded'; newVersion?: string }
    | { type: 'error'; message: string }

export type UpdateCheckResult =
    | { ok: true; status: 'available'; currentVersion: string; newVersion: string; releaseNotes?: string }
    | { ok: true; status: 'not-available'; currentVersion: string }
    | { ok: false; error: string }

export type UpdateDownloadResult =
    | { ok: true }
    | { ok: false; error: string }

export interface EntityExportFailureNotification {
    kind: 'titles' | 'persons' | 'locations' | 'phones'
    filePath: string
    message: string
}

export interface PhoneImageSaveFinalRequest {
    filename: string
    jpegBase64: string
}

export interface PhoneImageSaveFinalResponse {
    ok: boolean
    imageCsvValue?: string
    finalPath?: string
    error?: string
}

export interface PhoneImageLoadDataUrlRequest {
    imageRef: string
}

export interface PhoneImageLoadDataUrlResponse {
    ok: boolean
    dataUrl?: string
    error?: string
}

export interface PhoneImageGetImageDataUrlRequest {
    filename: string
}

export interface PhoneImageGetImageDataUrlResponse {
    ok: boolean
    dataUrl?: string
    error?: string
}

export interface PhoneImageWorkPathFile {
    filename: string
    imageCsvValue: string
    finalPath: string
}

export interface PhoneImageListWorkPathImagesResponse {
    ok: boolean
    files: PhoneImageWorkPathFile[]
    error?: string
}

export type TemplateEditorGetUserTemplateDocumentResponse =
    | { ok: true; document: TemplateDocument | null }
    | { ok: false; error: 'INVALID_TEMPLATE_JSON' | string }

export interface TemplateEditorSaveTemplateDocumentRequest {
    document: TemplateDocument
}

export type TemplateEditorSaveTemplateDocumentResponse =
    | { ok: true; skipped?: boolean }
    | { ok: false; error: string }

export interface IpcInvokeMap {
    [IPC_CHANNELS.CSV_GET_LAST]: {
        request: void
        response: CsvFileDescriptor | null
    }

    [IPC_CHANNELS.CSV_GET_WORKING]: {
        request: void
        response: CsvGetWorkingResponse
    }

    [IPC_CHANNELS.CSV_OPEN_DIALOG]: {
        request: void
        response: CsvFileDescriptor | null
    }

    [IPC_CHANNELS.CSV_WRITE]: {
        request: string // CSV content
        response: CsvWriteResponse
    }

    [IPC_CHANNELS.CSV_BKP]: {
        request: string // CSV content
        response: CsvBackupResponse
    }

    [IPC_CHANNELS.CSV_CREATE_BACKUP]: {
        request: CsvCreateBackupRequest
        response: CsvCreateBackupResponse
    }

    [IPC_CHANNELS.CSV_PROJECT_LIST]: {
        request: void
        response: CsvProjectListResponse
    }

    [IPC_CHANNELS.CSV_PROJECT_SAVE_AS]: {
        request: CsvProjectSaveAsRequest
        response: CsvProjectSaveAsResponse
    }

    [IPC_CHANNELS.CSV_PROJECT_LOAD_INTO_WORKING]: {
        request: CsvProjectLoadIntoWorkingRequest
        response: CsvProjectLoadIntoWorkingResponse
    }

    [IPC_CHANNELS.CSV_PROJECT_DELETE]: {
        request: CsvProjectDeleteRequest
        response: CsvProjectDeleteResponse
    }

    [IPC_CHANNELS.SETTINGS_GET_QUICK_TITLES]: {
        request: void
        response: string[]
    }

    [IPC_CHANNELS.SETTINGS_SET_QUICK_TITLES]: {
        request: string[]
        response: void
    }

    [IPC_CHANNELS.SETTINGS_GET_CONFIG]: {
        request: void
        response: AppConfig
    }

    [IPC_CHANNELS.SETTINGS_SET_CONFIG]: {
        request: AppConfig
        response: AppConfig
    }

    [IPC_CHANNELS.SETTINGS_GET_DEFAULT_PROJECT]: {
        request: void
        response: DefaultProjectSettings
    }

    [IPC_CHANNELS.SETTINGS_SET_DEFAULT_PROJECT]: {
        request: DefaultProjectSettings
        response: DefaultProjectSettings
    }

    [IPC_CHANNELS.SETTINGS_GET_PHONE_IMAGE]: {
        request: void
        response: PhoneImageSettings
    }

    [IPC_CHANNELS.SETTINGS_SET_PHONE_IMAGE]: {
        request: PhoneImageSettings
        response: PhoneImageSettings
    }

    [IPC_CHANNELS.SETTINGS_SELECT_WORK_PATH]: {
        request: void
        response: string | null
    }

    [IPC_CHANNELS.SETTINGS_GET_CSV_FILE]: {
        request: void
        response: CsvFileSettings
    }

    [IPC_CHANNELS.SETTINGS_SET_CSV_FILE]: {
        request: CsvFileSettings
        response: CsvFileSettings
    }

    [IPC_CHANNELS.SETTINGS_SELECT_WORKING_CSV]: {
        request: void
        response: string | null
    }

    [IPC_CHANNELS.SETTINGS_SELECT_BACKUP_FOLDER]: {
        request: void
        response: string | null
    }

    [IPC_CHANNELS.SETTINGS_SELECT_SAVED_PROJECTS_FOLDER]: {
        request: void
        response: string | null
    }

    [IPC_CHANNELS.SETTINGS_SELECT_EXPORT_CSV_FOLDER]: {
        request: void
        response: string | null
    }

    [IPC_CHANNELS.PHONE_IMAGE_SAVE_FINAL]: {
        request: PhoneImageSaveFinalRequest
        response: PhoneImageSaveFinalResponse
    }

    [IPC_CHANNELS.PHONE_IMAGE_LOAD_DATA_URL]: {
        request: PhoneImageLoadDataUrlRequest
        response: PhoneImageLoadDataUrlResponse
    }

    [IPC_CHANNELS.PHONE_IMAGE_LIST_WORK_PATH_IMAGES]: {
        request: void
        response: PhoneImageListWorkPathImagesResponse
    }

    [IPC_CHANNELS.PHONE_IMAGE_GET_IMAGE_DATA_URL]: {
        request: PhoneImageGetImageDataUrlRequest
        response: PhoneImageGetImageDataUrlResponse
    }

    [IPC_CHANNELS.TEMPLATE_EDITOR_GET_USER_TEMPLATE_DOCUMENT]: {
        request: void
        response: TemplateEditorGetUserTemplateDocumentResponse
    }

    [IPC_CHANNELS.TEMPLATE_EDITOR_SAVE_USER_TEMPLATE_DOCUMENT]: {
        request: TemplateEditorSaveTemplateDocumentRequest
        response: TemplateEditorSaveTemplateDocumentResponse
    }

    [IPC_CHANNELS.TEMPLATE_EDITOR_SAVE_DEV_DEFAULT_TEMPLATE_DOCUMENT]: {
        request: TemplateEditorSaveTemplateDocumentRequest
        response: TemplateEditorSaveTemplateDocumentResponse
    }

    [IPC_CHANNELS.UPDATE_GET_CURRENT_VERSION]: {
        request: void
        response: string
    }

    [IPC_CHANNELS.UPDATE_CHECK]: {
        request: void
        response: UpdateCheckResult
    }

    [IPC_CHANNELS.UPDATE_DOWNLOAD]: {
        request: void
        response: UpdateDownloadResult
    }

    [IPC_CHANNELS.UPDATE_INSTALL]: {
        request: void
        response: void
    }
}

export type IpcChannel = keyof IpcInvokeMap

export type IpcRequest<C extends IpcChannel> = IpcInvokeMap[C]['request']
export type IpcResponse<C extends IpcChannel> = IpcInvokeMap[C]['response']

// Renderer-facing API shape
export interface RendererApi {
    getLastCsv(): Promise<IpcResponse<typeof IPC_CHANNELS.CSV_GET_LAST>>
    getWorkingCsv(): Promise<IpcResponse<typeof IPC_CHANNELS.CSV_GET_WORKING>>
    /** @deprecated CSV selection now happens from Settings. */
    openCsvDialog(): Promise<IpcResponse<typeof IPC_CHANNELS.CSV_OPEN_DIALOG>>
    writeCsv(content: IpcRequest<typeof IPC_CHANNELS.CSV_WRITE>): Promise<IpcResponse<typeof IPC_CHANNELS.CSV_WRITE>>
    bkpCsv(content: IpcRequest<typeof IPC_CHANNELS.CSV_BKP>): Promise<IpcResponse<typeof IPC_CHANNELS.CSV_BKP>>
    createCsvBackup(request: IpcRequest<typeof IPC_CHANNELS.CSV_CREATE_BACKUP>): Promise<IpcResponse<typeof IPC_CHANNELS.CSV_CREATE_BACKUP>>
    listSavedCsvProjects(): Promise<IpcResponse<typeof IPC_CHANNELS.CSV_PROJECT_LIST>>
    saveCsvProjectAs(request: IpcRequest<typeof IPC_CHANNELS.CSV_PROJECT_SAVE_AS>): Promise<IpcResponse<typeof IPC_CHANNELS.CSV_PROJECT_SAVE_AS>>
    loadCsvProjectIntoWorking(request: IpcRequest<typeof IPC_CHANNELS.CSV_PROJECT_LOAD_INTO_WORKING>): Promise<IpcResponse<typeof IPC_CHANNELS.CSV_PROJECT_LOAD_INTO_WORKING>>
    deleteCsvProject(request: IpcRequest<typeof IPC_CHANNELS.CSV_PROJECT_DELETE>): Promise<IpcResponse<typeof IPC_CHANNELS.CSV_PROJECT_DELETE>>

    getQuickTitles(): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_GET_QUICK_TITLES>>
    setQuickTitles(list: IpcRequest<typeof IPC_CHANNELS.SETTINGS_SET_QUICK_TITLES>): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_SET_QUICK_TITLES>>

    getAppConfig(): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_GET_CONFIG>>
    setAppConfig(cfg: IpcRequest<typeof IPC_CHANNELS.SETTINGS_SET_CONFIG>): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_SET_CONFIG>>

    getDefaultProjectSettings(): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_GET_DEFAULT_PROJECT>>
    setDefaultProjectSettings(settings: IpcRequest<typeof IPC_CHANNELS.SETTINGS_SET_DEFAULT_PROJECT>): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_SET_DEFAULT_PROJECT>>

    getPhoneImageSettings(): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_GET_PHONE_IMAGE>>
    setPhoneImageSettings(settings: IpcRequest<typeof IPC_CHANNELS.SETTINGS_SET_PHONE_IMAGE>): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_SET_PHONE_IMAGE>>
    selectWorkPath(): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_SELECT_WORK_PATH>>
    getCsvFileSettings(): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_GET_CSV_FILE>>
    setCsvFileSettings(settings: IpcRequest<typeof IPC_CHANNELS.SETTINGS_SET_CSV_FILE>): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_SET_CSV_FILE>>
    selectWorkingCsv(): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_SELECT_WORKING_CSV>>
    selectBackupFolder(): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_SELECT_BACKUP_FOLDER>>
    selectSavedProjectsFolder(): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_SELECT_SAVED_PROJECTS_FOLDER>>
    selectExportCsvFolder(): Promise<IpcResponse<typeof IPC_CHANNELS.SETTINGS_SELECT_EXPORT_CSV_FOLDER>>

    saveFinalPhoneImage(request: IpcRequest<typeof IPC_CHANNELS.PHONE_IMAGE_SAVE_FINAL>): Promise<IpcResponse<typeof IPC_CHANNELS.PHONE_IMAGE_SAVE_FINAL>>
    loadPhoneImageDataUrl(request: IpcRequest<typeof IPC_CHANNELS.PHONE_IMAGE_LOAD_DATA_URL>): Promise<IpcResponse<typeof IPC_CHANNELS.PHONE_IMAGE_LOAD_DATA_URL>>
    listWorkPathImages(): Promise<IpcResponse<typeof IPC_CHANNELS.PHONE_IMAGE_LIST_WORK_PATH_IMAGES>>
    getPhoneImageDataUrl(request: IpcRequest<typeof IPC_CHANNELS.PHONE_IMAGE_GET_IMAGE_DATA_URL>): Promise<IpcResponse<typeof IPC_CHANNELS.PHONE_IMAGE_GET_IMAGE_DATA_URL>>

    getUserTemplateDocument(): Promise<IpcResponse<typeof IPC_CHANNELS.TEMPLATE_EDITOR_GET_USER_TEMPLATE_DOCUMENT>>
    saveUserTemplateDocument(request: IpcRequest<typeof IPC_CHANNELS.TEMPLATE_EDITOR_SAVE_USER_TEMPLATE_DOCUMENT>): Promise<IpcResponse<typeof IPC_CHANNELS.TEMPLATE_EDITOR_SAVE_USER_TEMPLATE_DOCUMENT>>
    saveDevDefaultTemplateDocument(request: IpcRequest<typeof IPC_CHANNELS.TEMPLATE_EDITOR_SAVE_DEV_DEFAULT_TEMPLATE_DOCUMENT>): Promise<IpcResponse<typeof IPC_CHANNELS.TEMPLATE_EDITOR_SAVE_DEV_DEFAULT_TEMPLATE_DOCUMENT>>

    onEntityExportError(callback: (notification: EntityExportFailureNotification) => void): () => void

    appUpdate: {
        getCurrentVersion(): Promise<IpcResponse<typeof IPC_CHANNELS.UPDATE_GET_CURRENT_VERSION>>
        checkForUpdates(): Promise<IpcResponse<typeof IPC_CHANNELS.UPDATE_CHECK>>
        downloadUpdate(): Promise<IpcResponse<typeof IPC_CHANNELS.UPDATE_DOWNLOAD>>
        installUpdate(): Promise<void>
        onStatus(callback: (status: UpdateStatus) => void): () => void
    }

    onMenuNavigate(callback: (route: string) => void): () => void
}
