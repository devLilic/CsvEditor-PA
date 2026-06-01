// electron/preload/api.ts
import { ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type { EntityExportFailureNotification, RendererApi, UpdateStatus } from '../../src/shared/ipc-types'

export const electronApi: RendererApi = {
    getLastCsv() {
        return ipcRenderer.invoke(IPC_CHANNELS.CSV_GET_LAST)
    },

    getWorkingCsv() {
        return ipcRenderer.invoke(IPC_CHANNELS.CSV_GET_WORKING)
    },

    // Legacy: CSV selection now happens from Settings.
    openCsvDialog() {
        return ipcRenderer.invoke(IPC_CHANNELS.CSV_OPEN_DIALOG)
    },

    writeCsv(content) {
        return ipcRenderer.invoke(IPC_CHANNELS.CSV_WRITE, content)
    },

    bkpCsv(content) {
        return ipcRenderer.invoke(IPC_CHANNELS.CSV_BKP, content)
    },

    createCsvBackup(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.CSV_CREATE_BACKUP, request)
    },

    listSavedCsvProjects() {
        return ipcRenderer.invoke(IPC_CHANNELS.CSV_PROJECT_LIST)
    },

    saveCsvProjectAs(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.CSV_PROJECT_SAVE_AS, request)
    },

    loadCsvProjectIntoWorking(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.CSV_PROJECT_LOAD_INTO_WORKING, request)
    },

    deleteCsvProject(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.CSV_PROJECT_DELETE, request)
    },

    getQuickTitles() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_QUICK_TITLES)
    },

    setQuickTitles(list) {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_QUICK_TITLES, list)
    },

    getAppConfig() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_CONFIG)
    },

    setAppConfig(cfg) {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_CONFIG, cfg)
    },

    getDefaultProjectSettings() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_DEFAULT_PROJECT)
    },

    setDefaultProjectSettings(settings) {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_DEFAULT_PROJECT, settings)
    },

    getPhoneImageSettings() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_PHONE_IMAGE)
    },

    setPhoneImageSettings(settings) {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_PHONE_IMAGE, settings)
    },

    selectWorkPath() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_WORK_PATH)
    },

    getCsvFileSettings() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_CSV_FILE)
    },

    setCsvFileSettings(settings) {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_CSV_FILE, settings)
    },

    selectWorkingCsv() {
        return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_WORKING_CSV)
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
        return ipcRenderer.invoke(IPC_CHANNELS.PHONE_IMAGE_SAVE_FINAL, request)
    },

    loadPhoneImageDataUrl(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.PHONE_IMAGE_LOAD_DATA_URL, request)
    },

    listWorkPathImages() {
        return ipcRenderer.invoke(IPC_CHANNELS.PHONE_IMAGE_LIST_WORK_PATH_IMAGES)
    },

    getPhoneImageDataUrl(request) {
        return ipcRenderer.invoke(IPC_CHANNELS.PHONE_IMAGE_GET_IMAGE_DATA_URL, request)
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
