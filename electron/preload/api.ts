// electron/preload/api.ts
import { ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type { EntityExportFailureNotification, RendererApi, UpdateStatus } from '../../src/shared/ipc-types'

let currentShowProjectId: string | undefined
function invokeScoped(channel: string, ...args: unknown[]) {
    return ipcRenderer.invoke(channel, ...args, { showProjectId: currentShowProjectId })
}
function invokeScopedFor(channel: string, showProjectId: string | undefined, ...args: unknown[]) {
    return ipcRenderer.invoke(channel, ...args, { showProjectId: showProjectId ?? currentShowProjectId })
}

export const electronApi: RendererApi = {
    setShowProjectScope(showProjectId) {
        currentShowProjectId = showProjectId || undefined
    },
    getShowProjectScope() {
        return currentShowProjectId ?? null
    },
    getLastCsv() {
        return invokeScoped(IPC_CHANNELS.CSV_GET_LAST)
    },

    getWorkingCsv(showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.CSV_GET_WORKING, showProjectId)
    },

    // Legacy: CSV selection now happens from Settings.
    openCsvDialog() {
        return invokeScoped(IPC_CHANNELS.CSV_OPEN_DIALOG)
    },

    writeCsv(content, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.CSV_WRITE, showProjectId, content)
    },

    bkpCsv(content, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.CSV_BKP, showProjectId, content)
    },

    createCsvBackup(request, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.CSV_CREATE_BACKUP, showProjectId, request)
    },

    listSavedCsvProjects(showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.CSV_PROJECT_LIST, showProjectId)
    },

    saveCsvProjectAs(request, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.CSV_PROJECT_SAVE_AS, showProjectId, request)
    },

    loadCsvProjectIntoWorking(request, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.CSV_PROJECT_LOAD_INTO_WORKING, showProjectId, request)
    },

    deleteCsvProject(request, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.CSV_PROJECT_DELETE, showProjectId, request)
    },

    reserveTitleBackup(request, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.TITLE_BACKUP_RESERVE, showProjectId, request)
    },

    listTitleBackups(showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.TITLE_BACKUP_LIST, showProjectId)
    },

    readTitleBackup(request, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.TITLE_BACKUP_READ, showProjectId, request)
    },

    writeTitleBackup(request, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.TITLE_BACKUP_WRITE, showProjectId, request)
    },

    getQuickTitles(showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.SETTINGS_GET_QUICK_TITLES, showProjectId)
    },

    setQuickTitles(list, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.SETTINGS_SET_QUICK_TITLES, showProjectId, list)
    },

    readQuickTitlesCsv(showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.QUICK_TITLES_READ_CSV, showProjectId)
    },

    writeQuickTitlesCsv(request, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.QUICK_TITLES_WRITE_CSV, showProjectId, request)
    },

    clearQuickTitlesCsv(showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.QUICK_TITLES_CLEAR_CSV, showProjectId)
    },

    getAppConfig() {
        return invokeScoped(IPC_CHANNELS.SETTINGS_GET_CONFIG)
    },

    setAppConfig(cfg) {
        return invokeScoped(IPC_CHANNELS.SETTINGS_SET_CONFIG, cfg)
    },

    getDefaultProjectSettings(showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.SETTINGS_GET_DEFAULT_PROJECT, showProjectId)
    },

    setDefaultProjectSettings(settings) {
        return invokeScoped(IPC_CHANNELS.SETTINGS_SET_DEFAULT_PROJECT, settings)
    },

    getPhoneImageSettings(showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.SETTINGS_GET_PHONE_IMAGE, showProjectId)
    },

    setPhoneImageSettings(settings) {
        return invokeScoped(IPC_CHANNELS.SETTINGS_SET_PHONE_IMAGE, settings)
    },

    selectWorkPath() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_WORK_PATH)
    },

    getCsvFileSettings(showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.SETTINGS_GET_CSV_FILE, showProjectId)
    },

    setCsvFileSettings(settings, showProjectId) {
        return invokeScopedFor(IPC_CHANNELS.SETTINGS_SET_CSV_FILE, showProjectId, settings)
    },

    selectWorkingCsv() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_WORKING_CSV)
    },
    selectProjectFolder() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_PROJECT_FOLDER)
    },

    selectBackupFolder() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_BACKUP_FOLDER)
    },

    selectSavedProjectsFolder() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_SAVED_PROJECTS_FOLDER)
    },

    selectExportCsvFolder() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_EXPORT_CSV_FOLDER)
    },

    saveFinalPhoneImage(request) {
        return invokeScoped(IPC_CHANNELS.PHONE_IMAGE_SAVE_FINAL, request)
    },

    loadPhoneImageDataUrl(request) {
        return invokeScoped(IPC_CHANNELS.PHONE_IMAGE_LOAD_DATA_URL, request)
    },

    listWorkPathImages() {
        return invokeScoped(IPC_CHANNELS.PHONE_IMAGE_LIST_WORK_PATH_IMAGES)
    },

    getPhoneImageDataUrl(request) {
        return invokeScoped(IPC_CHANNELS.PHONE_IMAGE_GET_IMAGE_DATA_URL, request)
    },

    getUserTemplateDocument() {
        return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_EDITOR_GET_USER_TEMPLATE_DOCUMENT)
    },

    saveUserTemplateDocument(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_EDITOR_SAVE_USER_TEMPLATE_DOCUMENT, request)
    },

    saveDevDefaultTemplateDocument(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_EDITOR_SAVE_DEV_DEFAULT_TEMPLATE_DOCUMENT, request)
    },

    getShowProjects() {
        return ipcRenderer.invoke(IPC_CHANNELS.SHOW_PROJECTS_GET)
    },

    saveShowProjects(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.SHOW_PROJECTS_SAVE, request)
    },

    importShowProject() {
        return ipcRenderer.invoke(IPC_CHANNELS.SHOW_PROJECTS_IMPORT)
    },

    exportShowProject(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.SHOW_PROJECTS_EXPORT, request)
    },

    saveShowProject(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.SHOW_PROJECTS_SAVE_PROJECT, request)
    },

    deleteShowProject(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.SHOW_PROJECTS_DELETE_PROJECT, request)
    },

    activateShowProject(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.SHOW_PROJECTS_ACTIVATE, request)
    },

    assignLegacyShowWorkspace(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.SHOW_PROJECTS_ASSIGN_LEGACY_WORKSPACE, request)
    },

    onEntityExportError(callback) {
        const listener = (_event: IpcRendererEvent, notification: EntityExportFailureNotification) => {
            callback(notification)
        }

        ipcRenderer.on(IPC_CHANNELS.ENTITY_EXPORT_ERROR, listener)

        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ENTITY_EXPORT_ERROR, listener)
        }
    },

    appUpdate: {
        getCurrentVersion() {
            return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_GET_CURRENT_VERSION)
        },

        checkForUpdates() {
            return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK)
        },

        downloadUpdate() {
            return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_DOWNLOAD)
        },

        async installUpdate() {
            await ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL)
        },

        onStatus(callback) {
            const listener = (_event: IpcRendererEvent, status: UpdateStatus) => {
                callback(status)
            }

            ipcRenderer.on(IPC_CHANNELS.UPDATE_STATUS, listener)

            return () => {
                ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_STATUS, listener)
            }
        },
    },

    onMenuNavigate(callback) {
        const listener = (_event: IpcRendererEvent, route: unknown) => {
            if (typeof route === 'string') {
                callback(route)
            }
        }

        ipcRenderer.on(IPC_CHANNELS.APP_MENU_NAVIGATE, listener)

        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.APP_MENU_NAVIGATE, listener)
        }
    },
}
