// src/ui/components/SectionTabs.tsx
import { useMemo, useState } from 'react'
import { useEntities } from '@/features/csv-editor'
import { useSelectedEntity } from '@/features/csv-editor'
import { useActiveEntityType } from '@/features/csv-editor'
import type { CsvSection } from '@/features/csv-editor'

function labelForSection(s: CsvSection) {
    if (s.kind === 'beta') {
        const idx = s.betaIndex ?? 0
        const title = s.betaTitle?.trim() || 'Fără titlu'
        return `BETA ${idx + 1} — ${title}`
    }
    return 'INVITAȚI'
}

export function SectionTabs() {
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

    const betaCount = useMemo(
        () => sections.filter((s) => s.kind === 'beta').length,
        [sections]
    )

    // UI-only state (permis): inline rename input
    const [renameId, setRenameId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState<string>('')

    const onSwitchSection = (sectionId: string) => {
        if (sectionId === activeSectionId) return
        clearSelection()
        setActiveEntityType('titles') // default consistent
        setActiveSection(sectionId)
    }

    const onAddBeta = () => {
        if (betaCount >= 5) return
        addBetaSection(`BETA ${betaCount + 1}`)
    }

    const startRename = (sectionId: string, current: string) => {
        setRenameId(sectionId)
        setRenameValue(current)
    }

    const commitRename = () => {
        if (!renameId) return
        renameBetaSection(renameId, renameValue.trim() || 'Fără titlu')
        setRenameId(null)
        setRenameValue('')
    }

    const cancelRename = () => {
        setRenameId(null)
        setRenameValue('')
    }

    const onDeleteBeta = (sectionId: string) => {
        const ok = window.confirm('Ștergi această secțiune BETA? Conținutul va fi pierdut.')
        if (!ok) return

        clearSelection()
        setActiveEntityType('titles')
        deleteBetaSection(sectionId)
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {sections.map((s) => {
                const active = s.id === activeSectionId
                const label = labelForSection(s)

                return (
                    <div key={s.id} className="flex items-center gap-1">
                        <button
                            onClick={() => onSwitchSection(s.id)}
                            className={`px-3 py-1 rounded text-sm border ${
                                active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'
                            }`}
                            title={label}
                        >
                            {label}
                        </button>

                        {s.kind === 'beta' && (
                            <>
                                {/* Rename */}
                                <button
                                    onClick={() => startRename(s.id, s.betaTitle ?? '')}
                                    className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
                                    title="Rename"
                                >
                                    ✎
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => onDeleteBeta(s.id)}
                                    className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
                                    title="Delete"
                                >
                                    🗑
                                </button>
                            </>
                        )}

                        {/* Inline rename box */}
                        {renameId === s.id && s.kind === 'beta' && (
                            <div className="ml-2 flex items-center gap-1">
                                <input
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    className="border rounded px-2 py-1 text-sm w-[240px]"
                                    placeholder="Titlu scurt..."
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitRename()
                                        if (e.key === 'Escape') cancelRename()
                                    }}
                                />
                                <button
                                    onClick={commitRename}
                                    className="px-2 py-1 text-xs rounded bg-blue-600 text-white"
                                >
                                    OK
                                </button>
                                <button onClick={cancelRename} className="px-2 py-1 text-xs rounded border bg-white">
                                    ESC
                                </button>
                            </div>
                        )}
                    </div>
                )
            })}

            <button
                onClick={onAddBeta}
                disabled={betaCount >= 5}
                className={`px-3 py-1 rounded text-sm border ${
                    betaCount >= 5 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                }`}
                title="Add BETA"
            >
                + BETA
            </button>
        </div>
    )
}