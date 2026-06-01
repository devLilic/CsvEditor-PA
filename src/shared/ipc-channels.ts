export const IPC_CHANNELS = {
    CSV_GET_LAST: "csv:getLast",
    CSV_GET_WORKING: "csv:get-working",
    // Legacy: CSV selection now happens from Settings.
    CSV_OPEN_DIALOG: "csv:openDialog",
    CSV_WRITE: "csv:write",
    CSV_BKP: "csv:bkp",
    CSV_CREATE_BACKUP: "csv:create-backup",
    CSV_PROJECT_LIST: "csv-project:list",
    CSV_PROJECT_SAVE_AS: "csv-project:save-as",
    CSV_PROJECT_LOAD_INTO_WORKING: "csv-project:load-into-working",
    CSV_PROJECT_DELETE: "csv-project:delete",

    SETTINGS_GET_QUICK_TITLES: "settings:get-quickTitles",
    SETTINGS_SET_QUICK_TITLES: "settings:set-quickTitles",

    SETTINGS_GET_CONFIG: "settings:get-config",
    SETTINGS_SET_CONFIG: "settings:set-config",

    SETTINGS_GET_DEFAULT_PROJECT: "settings:get-default-project",
    SETTINGS_SET_DEFAULT_PROJECT: "settings:set-default-project",

    SETTINGS_GET_PHONE_IMAGE: "settings:get-phone-image",
    SETTINGS_SET_PHONE_IMAGE: "settings:set-phone-image",
    SETTINGS_SELECT_WORK_PATH: "settings:select-work-path",
    SETTINGS_GET_CSV_FILE: "settings:get-csv-file",
    SETTINGS_SET_CSV_FILE: "settings:set-csv-file",
    SETTINGS_SELECT_WORKING_CSV: "settings:select-working-csv",
    SETTINGS_SELECT_BACKUP_FOLDER: "settings:select-backup-folder",
    SETTINGS_SELECT_SAVED_PROJECTS_FOLDER: "settings:select-saved-projects-folder",
    SETTINGS_SELECT_EXPORT_CSV_FOLDER: "settings:select-export-csv-folder",

    PHONE_IMAGE_SAVE_FINAL: "phone-image:save-final",
    PHONE_IMAGE_LOAD_DATA_URL: "phone-image:load-data-url",
    PHONE_IMAGE_LIST_WORK_PATH_IMAGES: "phone-image:list-work-path-images",
    PHONE_IMAGE_GET_IMAGE_DATA_URL: "phone-image:get-image-data-url",

    TEMPLATE_EDITOR_GET_USER_TEMPLATE_DOCUMENT: "template-editor:get-user-template-document",
    TEMPLATE_EDITOR_SAVE_USER_TEMPLATE_DOCUMENT: "template-editor:save-user-template-document",
    TEMPLATE_EDITOR_SAVE_DEV_DEFAULT_TEMPLATE_DOCUMENT: "template-editor:save-dev-default-template-document",

    ENTITY_EXPORT_ERROR: "entity-export:error",

    UPDATE_GET_CURRENT_VERSION: "update:get-current-version",
    UPDATE_CHECK: "update:check",
    UPDATE_DOWNLOAD: "update:download",
    UPDATE_INSTALL: "update:install",
    UPDATE_STATUS: "update:status",

    APP_MENU_NAVIGATE: "app-menu:navigate",
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
