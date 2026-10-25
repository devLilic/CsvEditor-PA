import { useCallback } from 'react'
import {
    DEFAULT_LOWER_THIRD_TYPES,
    type LowerThirdTypeDefinition,
} from '@/features/lower-thirds/domain/lowerThirdTypes'
import { useOptionalTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'

export function useLowerThirdTypes() {
    const context = useOptionalTemplateDocument()
    const { activeProject, activeProjectId, workspaces, isLoaded, saveProject } = context ?? {
        activeProject: null,
        activeProjectId: '',
        workspaces: {},
        isLoaded: false,
        saveProject: async () => ({ ok: false as const, error: 'SHOW_PROJECT_NOT_LOADED' }),
    }
    const types = ((activeProject as any)?.lowerThirdTypes ?? DEFAULT_LOWER_THIRD_TYPES) as LowerThirdTypeDefinition[]

    const setTypes = useCallback(async (nextTypes: LowerThirdTypeDefinition[]) => {
        if (!activeProject) throw new Error('SHOW_PROJECT_NOT_LOADED')
        const savedTypes = await saveProject({ ...activeProject, lowerThirdTypes: nextTypes } as any, workspaces[activeProjectId] ?? '')
        if (!savedTypes.ok) throw new Error(savedTypes.error ?? 'SHOW_PROJECT_SAVE_FAILED')
        return nextTypes
    }, [activeProject, activeProjectId, saveProject, workspaces])

    return { types, setTypes, isLoaded }
}
