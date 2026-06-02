import { app, ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'node:url'
import { isTemplateDocument } from '../../src/features/template-editor/domain/templateDocument'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type {
    TemplateEditorGetUserTemplateDocumentResponse,
    TemplateEditorSaveTemplateDocumentRequest,
    TemplateEditorSaveTemplateDocumentResponse,
} from '../../src/shared/ipc-types'

const fsp = fs.promises
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_FOLDER_NAME = 'templates'
const USER_TEMPLATE_FILENAME = 'paTemplates.json'
const DEV_DEFAULT_TEMPLATE_PATH = path.join(
    'src',
    'templates',
    'broadcast',
    'defaultTemplates.pa.json',
)

function getUserTemplatePath() {
    return path.join(app.getPath('userData'), TEMPLATE_FOLDER_NAME, USER_TEMPLATE_FILENAME)
}

function getDevDefaultTemplatePath() {
    return path.join(process.env.APP_ROOT ?? path.join(__dirname, '../..'), DEV_DEFAULT_TEMPLATE_PATH)
}

function formatTemplateDocument(document: unknown) {
    return `${JSON.stringify(document, null, 2)}\n`
}

function getTemplateDocumentFromRequest(request: unknown) {
    const payload = request as Partial<TemplateEditorSaveTemplateDocumentRequest> | null

    return payload?.document
}

async function readUserTemplateDocument(): Promise<TemplateEditorGetUserTemplateDocumentResponse> {
    const templatePath = getUserTemplatePath()
    const stat = await fsp.stat(templatePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null
        throw error
    })

    if (!stat?.isFile()) {
        return { ok: true, document: null }
    }

    try {
        const content = await fsp.readFile(templatePath, 'utf-8')
        const document = JSON.parse(content)

        if (!isTemplateDocument(document)) {
            return { ok: false, error: 'INVALID_TEMPLATE_JSON' }
        }

        return { ok: true, document }
    } catch (error) {
        if (error instanceof SyntaxError) {
            return { ok: false, error: 'INVALID_TEMPLATE_JSON' }
        }

        throw error
    }
}

async function saveUserTemplateDocument(
    request: unknown
): Promise<TemplateEditorSaveTemplateDocumentResponse> {
    const document = getTemplateDocumentFromRequest(request)
    if (!isTemplateDocument(document)) {
        return { ok: false, error: 'INVALID_TEMPLATE_JSON' }
    }

    const templatePath = getUserTemplatePath()
    await fsp.mkdir(path.dirname(templatePath), { recursive: true })
    await fsp.writeFile(templatePath, formatTemplateDocument(document), 'utf-8')

    return { ok: true }
}

async function saveDevDefaultTemplateDocument(
    request: unknown
): Promise<TemplateEditorSaveTemplateDocumentResponse> {
    if (app.isPackaged) {
        return { ok: true, skipped: true }
    }

    const document = getTemplateDocumentFromRequest(request)
    if (!isTemplateDocument(document)) {
        return { ok: false, error: 'INVALID_TEMPLATE_JSON' }
    }

    const templatePath = getDevDefaultTemplatePath()
    await fsp.mkdir(path.dirname(templatePath), { recursive: true })
    await fsp.writeFile(templatePath, formatTemplateDocument(document), 'utf-8')

    return { ok: true }
}

export function registerTemplateEditorHandlers() {
    ipcMain.handle(IPC_CHANNELS.TEMPLATE_EDITOR_GET_USER_TEMPLATE_DOCUMENT, async () => {
        try {
            return await readUserTemplateDocument()
        } catch (error) {
            console.error('[template-editor:get-user-template-document] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.TEMPLATE_EDITOR_SAVE_USER_TEMPLATE_DOCUMENT, async (_event, request: unknown) => {
        try {
            return await saveUserTemplateDocument(request)
        } catch (error) {
            console.error('[template-editor:save-user-template-document] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.TEMPLATE_EDITOR_SAVE_DEV_DEFAULT_TEMPLATE_DOCUMENT, async (_event, request: unknown) => {
        try {
            return await saveDevDefaultTemplateDocument(request)
        } catch (error) {
            console.error('[template-editor:save-dev-default-template-document] failed:', error)
            return { ok: false, error: (error as Error).message }
        }
    })
}
