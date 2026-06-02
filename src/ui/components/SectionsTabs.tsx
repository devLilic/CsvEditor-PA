// src/ui/components/SectionsTabs.tsx
import { useMemo, useState } from 'react'
import { useEntities, useSelectedEntity, useActiveEntityType } from '@/features/csv-editor'
import type { CsvSection, EditorViewType } from '@/features/csv-editor'
import { ConfirmDialog } from '@/ui/components/common/ConfirmDialog'
import { TextPromptDialog } from '@/ui/components/common/TextPromptDialog'

const DEFAULT_ENTITY: EditorViewType = 'titles'

function isBeta(section: CsvSection) {
    return section.kind === 'beta'
}

function EditIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
            />
        </svg>
    )
}

function DeleteIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6V4h8v2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14H6L5 6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
        </svg>
    )
}

export function SectionsTabs() {
    const {
        sections,
        activeSectionId,
        setActiveSection,
        addBetaSection,
        renameBetaSection,
        deleteBetaSection,
    } = useEntities()

    const { clearSelection } = useSelectedEntity()
    const { setActiveEntityType } = useActiveEntityType()

    const [addOpen, setAddOpen] = useState(false)
    const [renameOpen, setRenameOpen] = useState(false)
    const [renameSectionId, setRenameSectionId] = useState<string | null>(null)

    const handleSwitchSection = (sectionId: string) => {
        if (sectionId === activeSectionId) return

        clearSelection()
        setActiveEntityType(DEFAULT_ENTITY)
        setActiveSection(sectionId)
    }

    const handleDeleteBeta = (sectionId: string) => {
        clearSelection()
        deleteBetaSection(sectionId)
        setActiveEntityType(DEFAULT_ENTITY)
    }

    const openRename = (sectionId: string) => {
        setRenameSectionId(sectionId)
        setRenameOpen(true)
    }

    const renameInitialValue = useMemo(() => {
        if (!renameSectionId) return ''
        const section = sections.find((item) => item.id === renameSectionId)
        if (!section || !isBeta(section)) return ''
        return section.betaTitle ?? ''
    }, [renameSectionId, sections])

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {sections.map((section) => {
                const isActive = section.id === activeSectionId

                if (section.kind === 'beta') {
                    const label = `${section.betaTitle ?? 'Titlu'}`

                    return (
                        <div
                            key={section.id}
                            className={`flex items-center gap-1 rounded border px-2 py-1 ${
                                isActive ? 'bg-blue-600 text-white border-blue-700' : 'bg-white hover:bg-gray-50'
                            }`}
                        >
                            <button
                                onClick={() => handleSwitchSection(section.id)}
                                className="text-sm"
                                title={label}
                            >
                                {label}
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    openRename(section.id)
                                }}
                                className={`ml-1 inline-flex items-center justify-center rounded border px-2 py-1 ${
                                    isActive ? 'border-white/50 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-100'
                                }`}
                                title="Rename"
                                aria-label={`Editează secțiunea ${label}`}
                            >
                                <EditIcon />
                            </button>

                            <ConfirmDialog
                                title="Ștergi secțiunea BETA?"
                                description="Conținutul din această secțiune va fi șters. INVITAȚI rămâne mereu."
                                onConfirm={() => handleDeleteBeta(section.id)}
                            >
                                <button
                                    className={`inline-flex items-center justify-center rounded border px-2 py-1 ${
                                        isActive ? 'border-white/50 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-100'
                                    }`}
                                    title="Delete"
                                    aria-label={`Șterge secțiunea ${label}`}
                                >
                                    <DeleteIcon />
                                </button>
                            </ConfirmDialog>
                        </div>
                    )
                }

                return (
                    <button
                        key={section.id}
                        onClick={() => handleSwitchSection(section.id)}
                        className={`px-3 py-1 rounded text-sm border ${
                            isActive ? 'bg-blue-600 text-white border-blue-700' : 'bg-white hover:bg-gray-50 border-gray-200'
                        }`}
                    >
                        PLATOU
                    </button>
                )
            })}

            {/*<button*/}
            {/*    onClick={() => setAddOpen(true)}*/}
            {/*    className="px-3 py-1 rounded text-sm border bg-white border border-green-300 hover:bg-green-500 hover:text-white"*/}
            {/*    title="Add BETA"*/}
            {/*>*/}
            {/*    ADAUGĂ BETA*/}
            {/*</button>*/}

            <button
                onClick={() => setAddOpen(true)}
                className="px-3 py-1 rounded text-sm border bg-white border-green-300 hover:bg-green-500 hover:text-white"
                title="Add BETA"
            >
                ADAUGĂ BETA
            </button>

            <TextPromptDialog
                open={addOpen}
                title="Creează secțiune BETA"
                description="Introdu un titlu scurt (editabil). Partea „BETA X” se generează automat."
                placeholder="Ex: Consiliu UE"
                initialValue=""
                confirmText="Creează"
                onClose={() => setAddOpen(false)}
                onConfirm={(value) => {
                    const betaTitle = (value ?? '').trim() || ''
                    addBetaSection(betaTitle)
                }}
            />

            <TextPromptDialog
                open={renameOpen}
                title="Redenumește titlul BETA"
                description="Se schimbă doar partea editabilă (betaTitle)."
                placeholder="Titlu scurt…"
                initialValue={renameInitialValue || 'Titlu'}
                confirmText="Salvează"
                onClose={() => {
                    setRenameOpen(false)
                    setRenameSectionId(null)
                }}
                onConfirm={(value) => {
                    if (!renameSectionId) return
                    const nextTitle = (value ?? '').trim() || 'Titlu'
                    renameBetaSection(renameSectionId, nextTitle)
                }}
            />
        </div>
    )
}
