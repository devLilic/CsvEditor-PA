// src/ui/components/EntityEditor.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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
} from '@/features/csv-editor'
import { phoneImageSettingsService } from '@/features/csv-editor/services/phoneImageSettingsService'
import {
    type EditableTemplateEntityType,
    useTemplateDocument,
} from '@/features/template-editor/state/TemplateDocumentProvider'
import { createPreviewData } from '@/templates/broadcast'
import { Preview16x9 } from './Preview16x9'
import { QuickTitlesBar } from './QuickTitlesBar'
import { InputField } from './common/InputField'
import { PhoneImageModal } from './phone-image/PhoneImageModal'

type FormState = {
    title?: string
    name?: string
    occupation?: string
    location?: string
    image?: string
}

function getTemplateKeyForViewType(entityType: EntityType): EditableTemplateEntityType {
    return entityType
}

function isEntityTypeAllowedInSection(entityType: EntityType, sectionKind?: string) {
    return sectionKind !== 'beta' || entityType === 'titles' || entityType === 'persons'
}

export function EntityEditor() {
    const { activeSectionId, activeSection, getBlockItems, addEntity, updateEntity } = useEntities()

    const { selected, clearSelection } = useSelectedEntity()
    const { activeEntityType, setActiveEntityType } = useActiveEntityType()
    const { document: templateDocument } = useTemplateDocument()
    const editorEntityType = getCsvEntityTypeForEditorView(activeEntityType)
    const isAllowedInActiveSection = isEntityTypeAllowedInSection(activeEntityType, activeSection?.kind)

    const [showInvalid, setShowInvalid] = useState(false)
    const [form, setForm] = useState<FormState>({})
    const [phoneImageSettings, setPhoneImageSettings] = useState<PhoneImageSettings>(FALLBACK_PHONE_IMAGE_SETTINGS)
    const [phoneImageError, setPhoneImageError] = useState<string | null>(null)
    const [phoneImageModalOpen, setPhoneImageModalOpen] = useState(false)

    // refs focus
    const titleRef = useRef<HTMLInputElement>(null)
    const nameRef = useRef<HTMLInputElement>(null)
    const occupationRef = useRef<HTMLInputElement>(null)
    const locationRef = useRef<HTMLInputElement>(null)

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

    useEffect(() => {
        let isMounted = true

        phoneImageSettingsService.getPhoneImageSettings().then((settings) => {
            if (isMounted) {
                setPhoneImageSettings(settings)
            }
        })

        return () => {
            isMounted = false
        }
    }, [])

    // ---- helpers ----
    const focusPrimaryInput = useCallback(() => {
        let el: HTMLInputElement | null = null

        if (editorEntityType === 'persons') el = nameRef.current
        else if (editorEntityType === 'locations' || editorEntityType === 'waitLocations') el = locationRef.current
        else el = titleRef.current

        if (!el) return
        el.focus()
        const len = el.value.length
        try {
            el.setSelectionRange(len, len)
        } catch {
            // ignore (some inputs might not support selection range)
        }
    }, [editorEntityType])

    const focusTitleInput = useCallback(() => {
        const el = titleRef.current
        if (!el) return
        el.focus()
        const len = el.value.length
        try {
            el.setSelectionRange(len, len)
        } catch {
            // ignore
        }
    }, [])

    // ✅ populate form (ONLY when selection identity changes)
    useEffect(() => {
        if (!selected || !selectedItem) {
            setForm({})
            return
        }

        const data = (selectedItem as any).data

        switch (selected.entityType) {
            case 'persons':
                setForm({
                    name: data?.name ?? '',
                    occupation: data?.occupation ?? '',
                    image: data?.image ?? '',
                })
                setPhoneImageError(null)
                break

            case 'locations':
                setForm({
                    location: data?.location ?? '',
                })
                break

            default:
                setForm({
                    title: data?.title ?? '',
                })
        }
    }, [selected?.id, selected?.entityType, selected?.sectionId, selectedItem])

    // ✅ autofocus whenever context changes (tab, selection, section)
    useEffect(() => {
        focusPrimaryInput()
    }, [focusPrimaryInput, activeEntityType, selected?.id, selected?.sectionId])

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
            setForm({})
            // keep same activeViewType, but return to create mode
            requestAnimationFrame(() => focusPrimaryInput())
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [selected, clearSelection, focusPrimaryInput])

    const updateField = (key: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    // ✅ normalize only at SAVE time (prevents cursor jumping while editing)
    const normalizeForm = (f: FormState): FormState => {
        const next = { ...f }
        if (next.title) next.title = next.title.toUpperCase()
        if (next.name) next.name = next.name.toUpperCase()
        if (next.location) next.location = next.location.toUpperCase()
        // occupation stays mixed-case
        return next
    }

    const isFormValid = (): boolean => {
        if (!sectionId || !isAllowedInActiveSection) return false

        switch (activeEntityType) {
            case 'persons':
                return Boolean(form.name?.trim())

            case 'phoneCalls':
                return Boolean(form.name?.trim() && form.image?.trim())

            case 'locations':
            case 'waitLocations':
                return Boolean(form.location?.trim())

            case 'titles':
            case 'hotTitles':
            case 'waitTitles':
            default:
                return Boolean(form.title?.trim())
        }
    }

    const saveEntity = () => {
        if (!isFormValid()) {
            setShowInvalid(true)
            setTimeout(() => setShowInvalid(false), 600)
            return
        }

        const payload = normalizeForm(form)

        if (selected && selectedItem) {
            updateEntity(selected.sectionId, selected.entityType, selected.id, payload)
            clearSelection()
        } else {
            // create mode: use active section + active entity type
            addEntity(sectionId, editorEntityType, payload)
        }

        setForm({})
        requestAnimationFrame(() => focusPrimaryInput())
    }

    // ✅ QuickTitle: insert at beginning; if already has "XXX: " prefix, replace it
    const applyQuickTitle = (prefix: string) => {
        setForm((prev) => {
            const current = prev.title ?? ''
            const cleaned = current.replace(/^[^:]+:\s*/, '').trimStart()
            const normalizedPrefix = prefix.trim().replace(/:\s*$/, '').toUpperCase()
            const nextTitle = `${normalizedPrefix}: ${cleaned}`
            return { ...prev, title: nextTitle }
        })

        requestAnimationFrame(() => focusTitleInput())
    }

    const previewTemplate = templateDocument.templates[getTemplateKeyForViewType(activeEntityType)]
    const previewData = createPreviewData(activeEntityType, form)
    const phoneImageFilename = form.image
        ? getPhoneImageDisplayFilename(form.image) || form.image
        : ''

    return (
        <div className="bg-white rounded border p-4 flex flex-col gap-4 min-h-0 min-w-0 max-w-full overflow-hidden">

            <div
                data-testid="entity-preview-container"
                className="min-h-0 min-w-0 overflow-hidden"
            >
                <Preview16x9
                    template={previewTemplate}
                    data={previewData}
                    fitMode="width"
                    maxHeight={700}
                />
            </div>

            {/* inputs */}
            <div className="flex flex-col gap-3 w-full font-bold shrink-0">
                {editorEntityType === 'persons' && (
                    <>
                        <InputField
                            label="Nume"
                            value={form.name ?? ''}
                            uppercase
                            inputRef={nameRef}
                            onChange={(v) => updateField('name', v)}
                            onEnter={() => occupationRef.current?.focus()}
                            invalid={showInvalid}
                        />

                        <InputField
                            label="Funcție"
                            value={form.occupation ?? ''}
                            inputRef={occupationRef}
                            onChange={(v) => updateField('occupation', v)}
                            onEnter={saveEntity}
                        />

                        {activeEntityType === 'phoneCalls' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setPhoneImageModalOpen(true)}
                                    className="rounded border border-blue-500 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                                >
                                    {form.image ? 'Change Photo' : 'Add Photo'}
                                </button>

                                {form.image && (
                                    <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
                                        Poză adăugată: {phoneImageFilename}
                                    </div>
                                )}

                                {phoneImageError && (
                                    <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                        {phoneImageError}
                                    </div>
                                )}

                                {form.name?.trim() && !form.image?.trim() && !phoneImageError && (
                                    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
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
                    </>
                )}

                {(editorEntityType === 'locations' || editorEntityType === 'waitLocations') && (
                    <InputField
                        label="Locație"
                        value={form.location ?? ''}
                        uppercase
                        inputRef={locationRef}
                        onChange={(v) => updateField('location', v)}
                        onEnter={saveEntity}
                        invalid={showInvalid}
                    />
                )}

                {(editorEntityType === 'titles' || editorEntityType === 'hotTitles' || editorEntityType === 'waitTitles') && (
                    <InputField
                        label="Titlu"
                        value={form.title ?? ''}
                        inputRef={titleRef}
                        onChange={(v) => updateField('title', v)}
                        onEnter={saveEntity}
                        invalid={showInvalid}
                    />
                )}
            </div>

            <button
                onClick={saveEntity}
                disabled={!isFormValid()}
                className={`py-2 rounded text-white ${
                    isFormValid() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
                } shrink-0`}
            >
                {selected ? 'Update' : 'Adaugă'}
            </button>

            {/* QuickTitles doar la TITLES */}
            {editorEntityType === 'titles' && (
                <div className="border-t pt-3 mt-2 shrink-0">
                    <div className="text-xs text-gray-500 mb-2">Prefixe rapide</div>
                    <QuickTitlesBar onApplyPrefix={applyQuickTitle} focusEditor={focusTitleInput} />
                </div>
            )}
        </div>
    )
}
