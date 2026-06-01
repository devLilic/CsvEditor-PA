// src/test/mocks/ipcMock.ts
import { vi } from 'vitest'

export const ipcMock = {
    // CSV
    getLastCsv: vi.fn(),
    getWorkingCsv: vi.fn(),
    openCsvDialog: vi.fn(),
    writeCsv: vi.fn(),
    bkpCsv: vi.fn(), // ⬅️ OBLIGATORIU exact acest nume

    createCsvBackup: vi.fn(),
    listSavedCsvProjects: vi.fn(),
    saveCsvProjectAs: vi.fn(),
    loadCsvProjectIntoWorking: vi.fn(),
    deleteCsvProject: vi.fn(),

    // Settings
    getQuickTitles: vi.fn(),
    setQuickTitles: vi.fn(),
    getAppConfig: vi.fn(),
    setAppConfig: vi.fn(),
    getDefaultProjectSettings: vi.fn(),
    setDefaultProjectSettings: vi.fn(),
    getPhoneImageSettings: vi.fn(),
    setPhoneImageSettings: vi.fn(),
    selectWorkPath: vi.fn(),
    getCsvFileSettings: vi.fn(),
    setCsvFileSettings: vi.fn(),
    selectWorkingCsv: vi.fn(),
    selectBackupFolder: vi.fn(),
    selectSavedProjectsFolder: vi.fn(),
    selectExportCsvFolder: vi.fn(),
    saveFinalPhoneImage: vi.fn(),
    loadPhoneImageDataUrl: vi.fn(),
    listWorkPathImages: vi.fn(),
    getPhoneImageDataUrl: vi.fn(),
    getUserTemplateDocument: vi.fn(),
    saveUserTemplateDocument: vi.fn(),
    saveDevDefaultTemplateDocument: vi.fn(),
    onEntityExportError: vi.fn(() => vi.fn()),

    // App update
    appUpdate: {
        getCurrentVersion: vi.fn(),
        checkForUpdates: vi.fn(),
        downloadUpdate: vi.fn(),
        installUpdate: vi.fn(),
        onStatus: vi.fn(() => vi.fn()),
    },

    // App menu
    onMenuNavigate: vi.fn(() => vi.fn()),
}
