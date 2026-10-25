// src/ui/components/EntityEditor.tsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
    FALLBACK_PHONE_IMAGE_SETTINGS,
    buildSuggestedPhoneImageFilename,
    getPhoneImageDisplayFilename,
    type PhoneImageSettings,
    getCsvEntityTypeForEditorView,
    type EntityType,
    useEntities,
    useSelectedEntity,
    useActiveEntityType,
    useQuickTitles,
} from '@/features/csv-editor'
import { phoneImageSettingsService } from '@/features/csv-editor/services/phoneImageSettingsService'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import { applyQuickTitle as applyQuickTitleToEditor } from '@/features/quick-titles/domain/applyQuickTitle'
import { buildPersonQuickTitleSuggestion } from '@/features/quick-titles/domain/personQuickTitleSuggestion'
import {
    normalizeAndDeduplicateQuickTitles,
    normalizeQuickTitle,
} from '@/features/quick-titles/domain/quickTitle'
import {
    type EditableTemplateEntityType,
    useTemplateDocument,
} from '@/features/template-editor/state/TemplateDocumentProvider'
import { createTemplatePreviewData } from '@/templates/broadcast/createPreviewData'
import { Preview16x9 } from './Preview16x9'
import { QuickTitlesBar } from './QuickTitlesBar'
import { InputField } from './common/InputField'
import { PhoneImageModal } from './phone-image/PhoneImageModal'
import { PersonQuickTitleDialog } from './quick-titles/PersonQuickTitleDialog'
import { showErrorToast } from './common/toast'
import { ImportTitlesFromBackupDialog } from './title-backup/ImportTitlesFromBackupDialog'
import { useResizablePanel } from '@/ui/hooks/useResizablePanel'
import { useMeasuredElement } from '@/shared/preview/useMeasuredElement'
import {
    DEFAULT_LOWER_THIRD_TYPE_ID,
    DEFAULT_LOWER_THIRD_TYPES,
} from '@/features/lower-thirds/domain/lowerThirdTypes'
import { useLowerThirdTypes } from '@/ui/hooks/useLowerThirdTypes'
import type { RepeatSupratitleRequest } from './repeatSupratitle'

type FormState = {
    title?: string
    [fieldId: string]: string | undefined
    name?: string
    occupation?: string
    location?: string
    image?: string
}

const DEFAULT_PREVIEW_HEIGHT = 480
const MIN_PREVIEW_HEIGHT = 180
const MAX_PREVIEW_HEIGHT = 700
const MIN_FORM_HEIGHT = 180
const EDITOR_VERTICAL_CHROME = 24

function clampPreviewHeight(value: number) {
    return Math.min(MAX_PREVIEW_HEIGHT, Math.max(MIN_PREVIEW_HEIGHT, value))
}

function readSavedPreviewHeight(config: Awaited<ReturnType<typeof settingsService.getConfig>>): number | null {
    const layout = config.layout
    if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return null

    const value = (layout as Record<string, unknown>).previewHeight
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function createConfigWithPreviewHeight(
    config: Awaited<ReturnType<typeof settingsService.getConfig>>,
    previewHeight: number,
) {
    const layout = config.layout
    const safeLayout = layout && typeof layout === 'object' && !Array.isArray(layout)
        ? layout
        : {}

    return {
        ...config,
        layout: {
            ...safeLayout,
            previewHeight,
        },
    }
}

function getTemplateKeyForViewType(entityType: EntityType): EditableTemplateEntityType {
    return entityType
}

function isEntityTypeAllowedInSection(entityType: EntityType, sectionKind?: string) {
    return sectionKind !== 'beta' || entityType === 'titles' || entityType === 'persons'
}

function DividerButtonIcon() {
    return (
        <span className="relative block h-7 w-9" aria-hidden="true">
            <span className="absolute left-0 top-1 h-5 w-3 rounded-l-md border-y-[5px] border-l-[5px] border-gray-800" />
            <span className="absolute right-0 top-1 h-5 w-3 rounded-r-md border-y-[5px] border-r-[5px] border-gray-800" />
            <span className="absolute left-1/2 top-0 h-7 w-1.5 -translate-x-1/2 rounded-full bg-gray-800" />
        </span>
    )
}

function ArchiveImportIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 32 28"
            className="block h-6 w-7 opacity-80"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path
                d="M3.5 9.5h9l2.5 3h13.5v11H3.5v-14Z"
                strokeWidth="1.8"
            />
            <path
                d="M3.5 9.5v-2h9l2.5 3h13.5v2"
                strokeWidth="1.8"
            />
            <path
                d="M18 3.5v12"
                strokeWidth="2"
            />
            <path
                d="m13.5 11 4.5 4.5 4.5-4.5"
                strokeWidth="2"
            />
        </svg>
    )
}

export function EntityEditor({
    repeatSupratitleRequest = null,
    onRepeatSupratitleRequestHandled,
}: {
    repeatSupratitleRequest?: RepeatSupratitleRequest | null
    onRepeatSupratitleRequestHandled?: (requestId: number) => void
} = {}) {
    const { ref: editorPanelRef, size: editorPanelSize } = useMeasuredElement<HTMLDivElement>()
    const availablePreviewHeight = editorPanelSize.height > 0
        ? Math.max(
            MIN_PREVIEW_HEIGHT,
            Math.min(
                MAX_PREVIEW_HEIGHT,
                editorPanelSize.height - EDITOR_VERTICAL_CHROME - MIN_FORM_HEIGHT,
            ),
        )
        : MAX_PREVIEW_HEIGHT
    const savePreviewHeight = useCallback(async (nextHeight: number) => {
        const currentConfig = await settingsService.getConfig()
        await settingsService.setConfig(createConfigWithPreviewHeight(currentConfig, nextHeight))
    }, [])
    const handlePreviewResizeEnd = useCallback((height: number) => {
        void savePreviewHeight(height)
    }, [savePreviewHeight])
    const {
        width: previewHeight,
        isResizing: isPreviewResizing,
        setWidth: setPreviewHeight,
        startResize: startPreviewResize,
        resetWidth: resetPreviewHeight,
    } = useResizablePanel({
        defaultWidth: DEFAULT_PREVIEW_HEIGHT,
        minWidth: MIN_PREVIEW_HEIGHT,
        maxWidth: availablePreviewHeight,
        axis: 'y',
        onResizeEnd: handlePreviewResizeEnd,
    })

    const {
        activeSectionId,
        activeSection,
        getBlockItems,
        addEntity,
        updateEntity,
        savePersonEntity,
        addPlateauTitleDivider,
        importPlateauTitlesFromBackup,
    } = useEntities()

    const { selected, clearSelection } = useSelectedEntity()
    const { activeEntityType, setActiveEntityType } = useActiveEntityType()
    const { quickTitles, setAllQuickTitles } = useQuickTitles()
    const { document: templateDocument, lowerThirdTypesEnabled = true, activeProjectId, activeProject } = useTemplateDocument()
    const { types: lowerThirdTypes } = useLowerThirdTypes()
    const editorEntityType = getCsvEntityTypeForEditorView(activeEntityType)
    const isAllowedInActiveSection = isEntityTypeAllowedInSection(activeEntityType, activeSection?.kind)
    const [showInvalid, setShowInvalid] = useState(false)
    const [form, setForm] = useState<FormState>({})
    const [phoneImageSettings, setPhoneImageSettings] = useState<PhoneImageSettings>(FALLBACK_PHONE_IMAGE_SETTINGS)
    const [phoneImageError, setPhoneImageError] = useState<string | null>(null)
    const [phoneImageModalOpen, setPhoneImageModalOpen] = useState(false)
    const [isAddingDivider, setIsAddingDivider] = useState(false)
    const [enableDividerCreation, setEnableDividerCreation] = useState(true)
    const [importTitlesDialogOpen, setImportTitlesDialogOpen] = useState(false)
    const [activeQuickTitle, setActiveQuickTitle] = useState<string | null>(null)
    const [pendingRepeatRequest, setPendingRepeatRequest] = useState<RepeatSupratitleRequest | null>(null)
    const [repeatFocusToken, setRepeatFocusToken] = useState(0)
    const [quickTitleDialog, setQuickTitleDialog] = useState({
        open: false,
        initialValue: '',
        personName: '',
        isSaving: false,
        error: '',
    })

    // refs focus
    const titleRef = useRef<HTMLInputElement>(null)
    const supratitleRef = useRef<HTMLInputElement>(null)
    const pendingTitleCaretPositionRef = useRef<number | null>(null)
    const nameRef = useRef<HTMLInputElement>(null)
    const occupationRef = useRef<HTMLInputElement>(null)
    const locationRef = useRef<HTMLInputElement>(null)
    const preserveQuickTitleAfterUpdateRef = useRef(false)
    const preserveRepeatDraftAfterClearRef = useRef(false)
    const lastHandledRepeatRequestIdRef = useRef<number | null>(null)
    const lastSavedLowerThirdTypeIdRef = useRef(DEFAULT_LOWER_THIRD_TYPE_ID)

    useLayoutEffect(() => {
        const caretPosition = pendingTitleCaretPositionRef.current
        const input = titleRef.current
        if (caretPosition === null || !input || input.value !== (form.title ?? '')) return

        input.focus()
        input.setSelectionRange(caretPosition, caretPosition)
        pendingTitleCaretPositionRef.current = null
    }, [form.title, activeQuickTitle])

    useLayoutEffect(() => {
        if (!repeatFocusToken) return
        const input = titleRef.current
        if (!input) return
        input.focus()
        input.setSelectionRange(0, 0)
    }, [repeatFocusToken])

    useEffect(() => {
        let isMounted = true

        settingsService.getConfig().then((config) => {
            if (!isMounted) return
            const savedHeight = readSavedPreviewHeight(config)
            if (savedHeight !== null) setPreviewHeight(clampPreviewHeight(savedHeight))
        })

        return () => {
            isMounted = false
        }
    }, [setPreviewHeight])

    const sectionId = activeSectionId ?? ''
    const selectedLookupEntityType =
        selected?.entityType === 'persons' && activeEntityType === 'phoneCalls'
            ? 'phoneCalls'
            : selected?.entityType
    // ✅ memoize list + selectedItem (prevents "Maximum update depth exceeded")
    const selectedItems = useMemo(() => {
        if (!selected || !selectedLookupEntityType) return []
        return getBlockItems(selected.sectionId, selectedLookupEntityType)
    }, [getBlockItems, selected?.sectionId, selectedLookupEntityType])

    const selectedItem = useMemo(() => {
        if (!selected) return null
        return selectedItems.find((x: any) => x.id === selected.id) ?? null
    }, [selectedItems, selected?.id])

    const lowerThirdTypeId = lowerThirdTypesEnabled
        ? form.lowerThirdTypeId
            ?? (selectedItem as any)?.data?.lowerThirdTypeId
            ?? DEFAULT_LOWER_THIRD_TYPE_ID
        : DEFAULT_LOWER_THIRD_TYPE_ID
    const lowerThirdType = lowerThirdTypes.find((type) => type.id === lowerThirdTypeId)
        ?? lowerThirdTypes.find((type) => type.id === DEFAULT_LOWER_THIRD_TYPE_ID)
        ?? DEFAULT_LOWER_THIRD_TYPES[0]

    const activeTemplate = activeEntityType === 'titles' || activeEntityType === 'persons'
        ? lowerThirdTypesEnabled
            ? templateDocument.lowerThirdVariants[activeEntityType]?.[lowerThirdType.id]
                ?? templateDocument.templates[activeEntityType]
            : templateDocument.templates[activeEntityType]
        : templateDocument.templates[getTemplateKeyForViewType(activeEntityType)]
    const entityInputFields = useMemo(() => {
        const standardLabels: Record<string, string> = {
            title: 'Titlu',
            name: 'Nume',
            occupation: 'Funcție',
            location: 'Locație',
        }
        const fields: Array<{ fieldId: string; label: string }> = []
        for (const layer of activeTemplate.layers) {
            if (layer.type !== 'text' || layer.visible === false) continue
            const fieldIds = [layer.fieldId, ...(layer.textParts ?? []).map((part) => part.fieldId)]
            for (const fieldId of fieldIds) {
                const label = fieldId === layer.fieldId
                    ? layer.inputLabel !== undefined ? layer.inputLabel.trim() : standardLabels[fieldId]
                    : standardLabels[fieldId]
                if (!fieldId.trim() || !label || fields.some((field) => field.fieldId === fieldId)) continue
                fields.push({ fieldId, label })
            }
        }
        return fields.sort((a, b) => (
            a.fieldId === 'supratitle' ? -1 : b.fieldId === 'supratitle' ? 1 : 0
        ))
    }, [activeTemplate])
    const hasTitleInput = entityInputFields.some(({ fieldId }) => fieldId === 'title')

    useEffect(() => {
        if (preserveQuickTitleAfterUpdateRef.current && !selected) return
        setActiveQuickTitle(null)
    }, [activeEntityType, activeSectionId, selected?.id, selected?.entityType, selected?.sectionId])

    useEffect(() => {
        let isMounted = true

        phoneImageSettingsService.getPhoneImageSettings(activeProjectId).then((settings) => {
            if (isMounted) {
                const phoneImage = (activeProject as any)?.phoneImage
                setPhoneImageSettings({
                    ...settings,
                    width: phoneImage?.width ?? settings.width,
                    height: phoneImage?.height ?? settings.height,
                })
            }
        })

        return () => {
            isMounted = false
        }
    }, [activeProject, activeProjectId])

    useEffect(() => {
        let isMounted = true

        settingsService.getPlateauTitleDividerCreationEnabled().then((enabled) => {
            if (isMounted) {
                setEnableDividerCreation(enabled)
            }
        })

        return () => {
            isMounted = false
        }
    }, [])

    // ---- helpers ----
    const focusPrimaryInput = useCallback(() => {
        let el: HTMLInputElement | null = null
        const firstField = entityInputFields[0]?.fieldId
        if (firstField === 'title') el = titleRef.current
        else if (firstField === 'supratitle') el = supratitleRef.current
        else if (firstField === 'name') el = nameRef.current
        else if (firstField === 'occupation') el = occupationRef.current
        else if (firstField === 'location') el = locationRef.current

        if (!el) return
        el.focus()
        const len = el.value.length
        try {
            el.setSelectionRange(len, len)
        } catch {
            // ignore (some inputs might not support selection range)
        }
    }, [entityInputFields])

    const focusTitleInput = useCallback(() => {
        const el = titleRef.current ?? (entityInputFields[0]?.fieldId === 'supratitle' ? supratitleRef.current : null)
        if (!el) return
        el.focus()
        const len = el.value.length
        try {
            el.setSelectionRange(len, len)
        } catch {
            // ignore
        }
    }, [entityInputFields])

    const focusSupratitleInput = useCallback(() => {
        const el = supratitleRef.current
        if (!el) {
            focusTitleInput()
            return
        }
        el.focus()
        try {
            const len = el.value.length
            el.setSelectionRange(len, len)
        } catch {
            // ignore
        }
    }, [focusTitleInput])

    const getPersonNameForQuickTitle = useCallback((quickTitle: string) => {
        if (!activeSectionId || activeSection?.kind !== 'invited') return null
        const expectedName = normalizeQuickTitle(quickTitle).replace(/:\s*$/, '').trim()
        if (!expectedName) return null

        const person = getBlockItems(activeSectionId, 'persons').find((item) => (
            'data' in item
            && item.entityType === 'persons'
            && String(item.data?.name ?? '').trim().toUpperCase() === expectedName
        ))
        return person && 'data' in person && person.entityType === 'persons'
            ? String(person.data.name).trim()
            : null
    }, [activeSection?.kind, activeSectionId, getBlockItems])

    // Populate fields from the selected entity. Template layer hydration must
    // not reset an actively edited person form (for example phone-call edits).
    useEffect(() => {
        if (!selected || !selectedItem) {
            if (preserveRepeatDraftAfterClearRef.current) return
            if (preserveQuickTitleAfterUpdateRef.current) return
            setForm((current) => current.lowerThirdTypeId
                ? { lowerThirdTypeId: current.lowerThirdTypeId }
                : {})
            return
        }

        const data = (selectedItem as any).data
        lastSavedLowerThirdTypeIdRef.current = data?.lowerThirdTypeId ?? DEFAULT_LOWER_THIRD_TYPE_ID

        switch (selected.entityType) {
            case 'persons':
                setForm({
                    name: data?.name ?? '',
                    occupation: data?.occupation ?? '',
                    ...(data?.customFields ?? {}),
                    image: data?.image ?? '',
                    lowerThirdTypeId: data?.lowerThirdTypeId ?? DEFAULT_LOWER_THIRD_TYPE_ID,
                    lowerThirdTemplateOverride: data?.lowerThirdTemplateOverride ?? '',
                })
                setPhoneImageError(null)
                break

            case 'locations':
                setForm({
                    location: data?.location ?? '',
                    ...(data?.customFields ?? {}),
                })
                break

            default:
                setForm({
                    title: data?.title ?? '',
                    ...(data?.customFields ?? {}),
                    lowerThirdTypeId: data?.lowerThirdTypeId ?? DEFAULT_LOWER_THIRD_TYPE_ID,
                    lowerThirdTemplateOverride: data?.lowerThirdTemplateOverride ?? '',
                })
        }
    }, [selected?.id, selected?.entityType, selected?.sectionId, selectedItem])

    // Hydrate configured fields separately. When template layers arrive after
    // the entity selection, fill only missing values so active edits are kept.
    useEffect(() => {
        if (!selected || !selectedItem) return
        const data = (selectedItem as any).data

        setForm((current) => {
            const next = { ...current }
            for (const { fieldId } of entityInputFields) {
                if (next[fieldId] !== undefined) continue
                const value = String(data?.[fieldId] ?? data?.customFields?.[fieldId] ?? '')
                next[fieldId] = ['supratitle', 'name', 'location'].includes(fieldId)
                    ? value.toUpperCase()
                    : value
            }
            return next
        })
    }, [selected?.id, selected?.entityType, selected?.sectionId, selectedItem, entityInputFields])

    useEffect(() => {
        if (!preserveQuickTitleAfterUpdateRef.current || selected) return
        preserveQuickTitleAfterUpdateRef.current = false
    }, [selected?.id, selected?.entityType, selected?.sectionId])

    useEffect(() => {
        if (!preserveRepeatDraftAfterClearRef.current || selected) return
        preserveRepeatDraftAfterClearRef.current = false
    }, [selected?.id, selected?.entityType, selected?.sectionId])

    const hasUnsavedRepeatDraft = () => {
        if (selected && selectedItem) {
            const data = (selectedItem as any).data ?? {}
            const fieldIds = editorEntityType === 'titles'
                ? entityInputFields.map(({ fieldId }) => fieldId)
                : editorEntityType === 'persons'
                    ? ['name', 'occupation', 'image']
                    : ['location']
            return fieldIds.some((fieldId) => String(form[fieldId] ?? '') !== String(data[fieldId] ?? ''))
                || lowerThirdTypeId !== (data.lowerThirdTypeId ?? DEFAULT_LOWER_THIRD_TYPE_ID)
        }

        const fieldIds = editorEntityType === 'titles'
            ? entityInputFields.map(({ fieldId }) => fieldId)
            : editorEntityType === 'persons'
                ? ['name', 'occupation', 'image']
                : ['location']
        return fieldIds.some((fieldId) => Boolean(String(form[fieldId] ?? '').trim()))
            || lowerThirdTypeId !== lastSavedLowerThirdTypeIdRef.current
    }

    const applyRepeatSupratitle = (request: RepeatSupratitleRequest) => {
        preserveRepeatDraftAfterClearRef.current = Boolean(selected)
        if (selected) clearSelection()
        lastSavedLowerThirdTypeIdRef.current = request.lowerThirdTypeId
        setActiveQuickTitle(null)
        setPendingRepeatRequest(null)
        setForm({
            lowerThirdTypeId: request.lowerThirdTypeId,
            supratitle: request.supratitle,
            title: '',
        })
        setRepeatFocusToken((token) => token + 1)
        onRepeatSupratitleRequestHandled?.(request.requestId)
    }

    useEffect(() => {
        if (!repeatSupratitleRequest
            || lastHandledRepeatRequestIdRef.current === repeatSupratitleRequest.requestId) return
        lastHandledRepeatRequestIdRef.current = repeatSupratitleRequest.requestId
        if (hasUnsavedRepeatDraft()) setPendingRepeatRequest(repeatSupratitleRequest)
        else applyRepeatSupratitle(repeatSupratitleRequest)
    }, [repeatSupratitleRequest])

    // ✅ autofocus whenever context changes (tab, selection, section)
    useEffect(() => {
        focusPrimaryInput()
        // Do not steal focus when only the active lower-third variant changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeEntityType, selected?.id, selected?.sectionId])

    useEffect(() => {
        if (isAllowedInActiveSection) return
        clearSelection()
        setActiveEntityType('titles')
    }, [clearSelection, isAllowedInActiveSection, setActiveEntityType])

    // ✅ ESC clears selection + resets editor
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return
            if (!selected) return

            e.preventDefault()
            clearSelection()
            setForm({ lowerThirdTypeId })
            setActiveQuickTitle(null)
            // keep same activeViewType, but return to create mode
            requestAnimationFrame(() => focusPrimaryInput())
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [selected, clearSelection, focusPrimaryInput, lowerThirdTypeId])

    const updateField = (key: keyof FormState, value: string) => {
        const nextValue = key === 'supratitle' ? value.toUpperCase() : value

        if (key === 'title' && activeQuickTitle) {
            const personName = getPersonNameForQuickTitle(activeQuickTitle)
            if (personName) {
                const quoteCount = (nextValue.match(/"/g) ?? []).length
                if (quoteCount < 2) {
                    setActiveQuickTitle(null)
                    setForm((prev) => ({ ...prev, supratitle: '' }))
                }
            } else {
                const normalizedActiveQuickTitle = normalizeQuickTitle(activeQuickTitle)
                const stillHasActivePrefix = nextValue
                    .toUpperCase()
                    .startsWith(normalizedActiveQuickTitle)

                if (!stillHasActivePrefix) {
                    setActiveQuickTitle(null)
                }
            }
        }

        setForm((prev) => ({
            ...prev,
            [key]: nextValue,
            ...(key === 'lowerThirdTypeId' && nextValue !== lowerThirdTypeId
                ? { lowerThirdTemplateOverride: '' }
                : {}),
        }))
    }

    // ✅ normalize only at SAVE time (prevents cursor jumping while editing)
    const normalizeForm = (f: FormState): FormState => {
        const next = { ...f }
        if (next.title && activeEntityType !== 'titles') next.title = next.title.toUpperCase()
        for (const { fieldId } of entityInputFields) {
            if (['supratitle', 'name', 'location'].includes(fieldId) && next[fieldId]) {
                next[fieldId] = next[fieldId]!.toUpperCase()
            }
        }
        return next
    }

    const isFormValid = (): boolean => {
        if (!sectionId || !isAllowedInActiveSection) return false

        switch (activeEntityType) {
            case 'persons':
                return entityInputFields.some(({ fieldId }) => Boolean(form[fieldId]?.trim()))

            case 'phoneCalls':
                return Boolean(form.image?.trim() && entityInputFields.some(({ fieldId }) => Boolean(form[fieldId]?.trim())))

            case 'locations':
            case 'waitLocations':
                return entityInputFields.some(({ fieldId }) => Boolean(form[fieldId]?.trim()))

            case 'titles':
            case 'waitTitles':
            default:
                if (!entityInputFields.some(({ fieldId }) => Boolean(form[fieldId]?.trim()))) return false
                if (!hasTitleInput || !activeQuickTitle) return true
                const titleValue = form.title ?? ''
                if (!titleValue.trim()) return false

                const activePersonName = getPersonNameForQuickTitle(activeQuickTitle)
                if (activePersonName) {
                    const quotedBody = titleValue.match(/^"([\s\S]*)"$/)?.[1] ?? ''
                    return Boolean(quotedBody.trim())
                }

                const normalizedActiveQuickTitle = normalizeQuickTitle(activeQuickTitle)
                const hasActivePrefix = titleValue
                    .toUpperCase()
                    .startsWith(normalizedActiveQuickTitle)

                return !hasActivePrefix ||
                    Boolean(titleValue.slice(normalizedActiveQuickTitle.length).trim())
        }
    }

    const canUsePlateauTitleTools =
        activeSection?.kind === 'invited' &&
        activeEntityType === 'titles' &&
        editorEntityType === 'titles' &&
        hasTitleInput
    const canAddTitleDivider = enableDividerCreation && canUsePlateauTitleTools
    const canImportTitlesFromBackup = canUsePlateauTitleTools

    const addTitleDivider = async () => {
        if (!canAddTitleDivider || isAddingDivider) return

        setIsAddingDivider(true)

        try {
            const selectedTitleRowId =
                selected?.sectionId === sectionId && selected.entityType === 'titles'
                    ? (selectedItem as any)?.rowId
                    : undefined
            const result = selectedTitleRowId
                ? await addPlateauTitleDivider({ afterItemId: selectedTitleRowId })
                : await addPlateauTitleDivider()

            if (!result.ok) {
                showErrorToast(result.error ?? 'TITLE_DIVIDER_SAVE_FAILED')
            }

            lastSavedLowerThirdTypeIdRef.current = lowerThirdTypeId
        } finally {
            setIsAddingDivider(false)
        }
    }

    const saveEntity = async () => {
        if (!isFormValid()) {
            setShowInvalid(true)
            setTimeout(() => setShowInvalid(false), 600)
            return
        }

        const payload = normalizeForm(form) as Record<string, any>
        const customFieldIds = entityInputFields
            .map(({ fieldId }) => fieldId)
            .filter((fieldId) => !['title', 'supratitle', 'name', 'occupation', 'location'].includes(fieldId))
        const savedCustomFields = {
            ...((selectedItem as any)?.data?.customFields ?? {}),
        } as Record<string, string>
        for (const fieldId of customFieldIds) {
            if (payload[fieldId] !== undefined) savedCustomFields[fieldId] = String(payload[fieldId])
            delete payload[fieldId]
        }
        if (Object.keys(savedCustomFields).length > 0) payload.customFields = savedCustomFields
        const storedLowerThirdTypeId = (selectedItem as any)?.data?.lowerThirdTypeId ?? DEFAULT_LOWER_THIRD_TYPE_ID
        const storedTemplateOverride = (selectedItem as any)?.data?.lowerThirdTemplateOverride ?? ''
        const isChangingLowerThirdType = payload.lowerThirdTypeId !== undefined
            && payload.lowerThirdTypeId !== storedLowerThirdTypeId
        if (!isChangingLowerThirdType) delete payload.lowerThirdTypeId
        if (!isChangingLowerThirdType && (payload.lowerThirdTemplateOverride ?? '') === storedTemplateOverride) {
            delete payload.lowerThirdTemplateOverride
        }
        if (!selected && payload.lowerThirdTypeId === DEFAULT_LOWER_THIRD_TYPE_ID) {
            delete payload.lowerThirdTypeId
        }
        if (!selected && !isChangingLowerThirdType) {
            delete payload.lowerThirdTemplateOverride
        }
        if (!selected) {
            for (const { fieldId } of entityInputFields) {
                if (!payload[fieldId]?.trim()) delete payload[fieldId]
            }
        }

        if (activeEntityType === 'persons') {
            const savedPersonName = payload.name ?? ''
            const shouldPromptQuickTitle =
                activeSection?.kind === 'invited' &&
                !payload.image?.trim()
            const result = await savePersonEntity({
                sectionId: selected?.sectionId ?? sectionId,
                id: selected?.id,
                data: payload,
            })

            if (!result.ok) {
                console.error('Person save failed:', result.error)
                return
            }

            if (selected && selectedItem) {
                clearSelection()
            }

            setForm({ lowerThirdTypeId })
            setActiveQuickTitle(null)
            requestAnimationFrame(() => focusPrimaryInput())

            if (shouldPromptQuickTitle) {
                setQuickTitleDialog({
                    open: true,
                    initialValue: buildPersonQuickTitleSuggestion({
                        personName: savedPersonName,
                        existingQuickTitles: quickTitles,
                    }),
                    personName: savedPersonName,
                    isSaving: false,
                    error: '',
                })
            }
            return
        }

        const quickTitleToRestore = editorEntityType === 'titles'
            ? activeQuickTitle
            : null

        if (selected && selectedItem) {
            preserveQuickTitleAfterUpdateRef.current = Boolean(quickTitleToRestore)
            updateEntity(selected.sectionId, selected.entityType, selected.id, payload)
            clearSelection()
        } else {
            // create mode: use active section + active entity type
            addEntity(sectionId, editorEntityType, payload)
        }

        lastSavedLowerThirdTypeIdRef.current = lowerThirdTypeId

        const restoredPersonName = quickTitleToRestore
            ? getPersonNameForQuickTitle(quickTitleToRestore)
            : null
        if (restoredPersonName) pendingTitleCaretPositionRef.current = 1
        setForm(quickTitleToRestore
            ? restoredPersonName
                ? {
                    lowerThirdTypeId,
                    supratitle: `${restoredPersonName.toUpperCase()}:`,
                    title: '""',
                }
                : { lowerThirdTypeId, title: quickTitleToRestore }
            : { lowerThirdTypeId })
        setActiveQuickTitle(quickTitleToRestore)
        if (!restoredPersonName) requestAnimationFrame(() => focusPrimaryInput())
    }

    // Person QuickTitles create a quote with the guest in Supratitlu; ordinary
    // QuickTitles keep their existing prefix behavior.
    const applyQuickTitle = (prefix: string) => {
        const personName = getPersonNameForQuickTitle(prefix)
        if (personName) {
            const isSelectedPersonActive = activeQuickTitle !== null
                && normalizeQuickTitle(activeQuickTitle) === normalizeQuickTitle(prefix)
            let titleBody = (form.title ?? '').replace(/"/g, '')
            if (!isSelectedPersonActive) {
                titleBody = titleBody.replace(/^[^:]+:\s*/, '').trimStart()
                pendingTitleCaretPositionRef.current = 1
            }

            setForm((prev) => ({
                ...prev,
                supratitle: isSelectedPersonActive ? '' : `${personName.toUpperCase()}:`,
                title: isSelectedPersonActive ? titleBody : `"${titleBody}"`,
            }))
            setActiveQuickTitle(isSelectedPersonActive ? null : normalizeQuickTitle(prefix))

            if (isSelectedPersonActive) {
                focusSupratitleInput()
            }
            return
        }

        const result = applyQuickTitleToEditor({
            editorValue: form.title ?? '',
            selectedQuickTitle: prefix,
            activeQuickTitle,
        })

        setForm((prev) => {
            return { ...prev, title: result.editorValue }
        })
        setActiveQuickTitle(result.activeQuickTitle)

        if (result.toggledOn) requestAnimationFrame(() => focusTitleInput())
        else focusSupratitleInput()
    }

    const previewTemplate = activeTemplate
    const previewCustomFields = Object.fromEntries(
        entityInputFields
            .filter(({ fieldId }) => !['title', 'supratitle', 'name', 'occupation', 'location', 'image'].includes(fieldId))
            .map(({ fieldId }) => [fieldId, String(form[fieldId] ?? (selectedItem as any)?.data?.customFields?.[fieldId] ?? '')]),
    )
    const previewData = createTemplatePreviewData(activeEntityType, {
        ...form,
        customFields: {
            ...((selectedItem as any)?.data?.customFields ?? {}),
            ...previewCustomFields,
        },
    }, previewTemplate)
    const hasMatchingStoredType = form.lowerThirdTypeId === (selectedItem as any)?.data?.lowerThirdTypeId
        || (form.lowerThirdTypeId === DEFAULT_LOWER_THIRD_TYPE_ID
            && !(selectedItem as any)?.data?.lowerThirdTypeId)
    const storedTemplateOverride = hasMatchingStoredType
        ? (selectedItem as any)?.data?.lowerThirdTemplateOverride
        : undefined
    const lowerThirdCategory = activeEntityType === 'persons' ? 'persons' : 'titles'
    const templateVariant = activeEntityType === 'titles' || activeEntityType === 'persons'
        ? (lowerThirdTypesEnabled && (form.lowerThirdTemplateOverride?.trim() || storedTemplateOverride))
            || lowerThirdType.templates[lowerThirdCategory].name
        : undefined
    const phoneImageFilename = form.image
        ? getPhoneImageDisplayFilename(form.image) || form.image
        : ''

    return (
        <div ref={editorPanelRef} className={`app-panel app-editor bg-white rounded border p-4 flex flex-col gap-2 min-h-0 min-w-0 max-w-full h-full overflow-hidden ${isPreviewResizing ? 'select-none' : ''}`}>

            <div
                data-testid="entity-preview-container"
                className="app-preview-container min-h-0 min-w-0 shrink-0 overflow-hidden"
                style={{ height: previewHeight }}
            >
                <Preview16x9
                    template={previewTemplate}
                    data={previewData}
                    fitMode="contain"
                    maxHeight={700}
                    className="h-full"
                    templateVariant={templateVariant}
                    lowerThirdPalette={templateVariant && lowerThirdType.id !== DEFAULT_LOWER_THIRD_TYPE_ID ? lowerThirdType.palette : undefined}
                />
            </div>

            <div
                role="separator"
                aria-label="Resize preview and editor"
                aria-orientation="horizontal"
                onPointerDown={startPreviewResize}
                onDoubleClick={resetPreviewHeight}
                className="app-resizer group flex h-2 shrink-0 cursor-row-resize items-center justify-center touch-none"
            >
                <div className="h-px w-full bg-gray-300 group-hover:bg-blue-500" />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
            {/* inputs */}
            <div className="flex flex-col gap-3 w-full font-bold shrink-0">
                {lowerThirdTypesEnabled && (activeEntityType === 'titles' || activeEntityType === 'persons') && (
                    <div
                        role="radiogroup"
                        aria-label="Tip lower third"
                        className="flex w-full flex-nowrap justify-end gap-1.5 overflow-x-auto pb-1"
                    >
                        {lowerThirdTypes.map((type) => {
                            const isActive = type.id === lowerThirdTypeId
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={isActive}
                                    onClick={() => updateField('lowerThirdTypeId', type.id)}
                                    className={`inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold outline-none transition-colors focus:outline-none ${
                                        isActive
                                            ? 'shadow-sm'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    style={isActive ? {
                                        backgroundColor: type.palette.backgroundColor,
                                        color: type.palette.textColor,
                                    } : undefined}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${isActive ? 'ring-1 ring-white/70' : 'border border-black/20'}`}
                                        style={{ backgroundColor: type.palette.indicatorColor }}
                                    />
                                    <span className="truncate">{type.name}</span>
                                </button>
                            )
                        })}
                    </div>
                )}
                {(activeEntityType === 'titles' || activeEntityType === 'persons')
                    && lowerThirdTypesEnabled && form.lowerThirdTemplateOverride?.trim() && (
                        <p role="status" className="app-notification app-notification-warning rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                            Șablonul „{form.lowerThirdTemplateOverride}” nu există în setări. Se folosește designul Obișnuit, iar valoarea va fi păstrată la export.
                        </p>
                    )}
                {activeEntityType !== 'hotTitles' && entityInputFields.map(({ fieldId, label }, index) => (
                    <InputField
                        key={fieldId}
                        label={label}
                        placeholder={label}
                        hideLabel
                        value={form[fieldId] ?? ''}
                        inputRef={fieldId === 'title' ? titleRef
                            : fieldId === 'supratitle' ? supratitleRef
                                : fieldId === 'name' ? nameRef
                                    : fieldId === 'occupation' ? occupationRef
                                        : fieldId === 'location' ? locationRef
                                            : undefined}
                        uppercase={['supratitle', 'name', 'location'].includes(fieldId)}
                        onChange={(value) => updateField(fieldId, value)}
                        onEnter={() => {
                            const nextField = entityInputFields[index + 1]?.fieldId
                            const nextRef = nextField === 'title' ? titleRef
                                : nextField === 'supratitle' ? supratitleRef
                                    : nextField === 'name' ? nameRef
                                        : nextField === 'occupation' ? occupationRef
                                            : nextField === 'location' ? locationRef
                                                : undefined
                            if (nextRef) nextRef.current?.focus()
                            else void saveEntity()
                        }}
                        invalid={showInvalid}
                    />
                ))}
                {activeEntityType === 'phoneCalls' && (
                    <>
                        <button
                            type="button"
                            onClick={() => setPhoneImageModalOpen(true)}
                            className="app-button app-button-secondary rounded border border-blue-500 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                        >
                            {form.image ? 'Change Photo' : 'Add Photo'}
                        </button>

                        {form.image && (
                            <div className="app-notification app-notification-success rounded border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
                                Poză adăugată: {phoneImageFilename}
                            </div>
                        )}

                        {phoneImageError && (
                            <div className="app-notification app-notification-danger rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                {phoneImageError}
                            </div>
                        )}

                        {form.name?.trim() && !form.image?.trim() && !phoneImageError && (
                            <div className="app-notification app-notification-warning rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                                Adaugă o poză înainte de salvare.
                            </div>
                        )}

                        <PhoneImageModal
                            open={phoneImageModalOpen}
                            settings={phoneImageSettings}
                            initialFilename={form.image?.replace(/^WORK_PATH\//, '')}
                            suggestedFilename={buildSuggestedPhoneImageFilename(form.name ?? '')}
                            onClose={() => setPhoneImageModalOpen(false)}
                            onSaved={(imageCsvValue) => {
                                setPhoneImageError(null)
                                updateField('image', imageCsvValue)
                            }}
                        />
                    </>
                )}
            </div>

            <div className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center">
                    <button
                        onClick={saveEntity}
                        disabled={!isFormValid()}
                        className={`app-button app-button-primary app-work-primary-button flex-1 py-2 rounded text-white ${
                            isFormValid() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {selected ? 'Update (Enter)' : 'Adaugă (Enter)'}
                    </button>

                    {canImportTitlesFromBackup && (
                        <button
                            type="button"
                            aria-label="Importă din arhivă"
                            title="Importă din arhivă"
                            onClick={() => setImportTitlesDialogOpen(true)}
                            className="app-button app-button-secondary app-import-backup-button ml-6 flex h-10 w-12 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                            <ArchiveImportIcon />
                        </button>
                    )}

                    {canAddTitleDivider && (
                        <button
                            type="button"
                            aria-label="Separator vizual"
                            title="Adauga separator vizual"
                            onClick={addTitleDivider}
                            disabled={isAddingDivider}
                            className="app-button app-divider-button ml-8 flex h-10 w-12 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <DividerButtonIcon />
                        </button>
                    )}
                </div>

            </div>

            {/* QuickTitles doar la TITLES */}
            {editorEntityType === 'titles' && hasTitleInput && (
                <div className="app-panel-divider border-t pt-3 mt-2 shrink-0">
                    <QuickTitlesBar
                        onApplyPrefix={applyQuickTitle}
                        focusEditor={focusTitleInput}
                        activeQuickTitle={activeQuickTitle}
                    />
                </div>
            )}
            </div>

            <PersonQuickTitleDialog
                open={quickTitleDialog.open}
                initialValue={quickTitleDialog.initialValue}
                personName={quickTitleDialog.personName}
                isSaving={quickTitleDialog.isSaving}
                error={quickTitleDialog.error || undefined}
                onSave={async (value) => {
                    setQuickTitleDialog((prev) => ({ ...prev, isSaving: true, error: '' }))

                    try {
                        await setAllQuickTitles(normalizeAndDeduplicateQuickTitles([
                            ...quickTitles,
                            value,
                        ]))
                        setQuickTitleDialog((prev) => ({
                            ...prev,
                            open: false,
                            isSaving: false,
                            error: '',
                        }))
                    } catch (error) {
                        setQuickTitleDialog((prev) => ({
                            ...prev,
                            isSaving: false,
                            error: error instanceof Error ? error.message : 'QUICK_TITLE_SAVE_FAILED',
                        }))
                    }
                }}
                onCancel={() => setQuickTitleDialog((prev) => ({ ...prev, open: false, error: '' }))}
            />

            {pendingRepeatRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <section role="dialog" aria-modal="true" aria-labelledby="repeat-supratitle-confirm-title" className="w-full max-w-md rounded bg-white p-5 shadow-xl">
                        <h2 id="repeat-supratitle-confirm-title" className="text-lg font-semibold">Modificări nesalvate</h2>
                        <p className="mt-2 text-sm text-gray-700">Confirmi înlocuirea draftului curent cu supratitlul repetat?</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                className="app-button rounded border px-3 py-2"
                                onClick={() => {
                                    const request = pendingRepeatRequest
                                    setPendingRepeatRequest(null)
                                    onRepeatSupratitleRequestHandled?.(request.requestId)
                                }}
                            >Anulează</button>
                            <button
                                type="button"
                                className="app-button app-button-primary rounded bg-blue-700 px-3 py-2 text-white"
                                onClick={() => applyRepeatSupratitle(pendingRepeatRequest)}
                            >Confirmă</button>
                        </div>
                    </section>
                </div>
            )}

            <ImportTitlesFromBackupDialog
                open={importTitlesDialogOpen}
                onClose={() => setImportTitlesDialogOpen(false)}
                onImport={async (items) => {
                    const result = await importPlateauTitlesFromBackup(items)

                    if (!result.ok) {
                        showErrorToast(result.error)
                    }

                    return result
                }}
            />
        </div>
    )
}
