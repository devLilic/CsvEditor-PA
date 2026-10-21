// src/ui/components/QuickTitlesBar.tsx
import {useRef} from 'react'
import {useQuickTitles} from '@/features/csv-editor'
import { normalizeQuickTitle } from '@/features/quick-titles/domain/quickTitle'
import {useEditMode} from "@/ui/context/EditModeContext";

interface QuickTitlesBarProps {
    onApplyPrefix: (prefix: string) => void
    focusEditor: () => void
    activeQuickTitle?: string | null
}

export { normalizeQuickTitle }


export function QuickTitlesBar({
                                   onApplyPrefix,
                                   focusEditor,
                                   activeQuickTitle = null,
                               }: QuickTitlesBarProps) {
    const {
        quickTitles,
        addQuickTitle,
        removeQuickTitle,
    } = useQuickTitles()
    const {editMode} = useEditMode()


    const inputRef = useRef<HTMLInputElement>(null)
    const normalizedActiveQuickTitle = activeQuickTitle
        ? normalizeQuickTitle(activeQuickTitle)
        : null

    const handleCreate = async () => {
        const value = normalizeQuickTitle(inputRef.current?.value ?? '')
        if (!value) return

        await addQuickTitle(value)
        inputRef.current!.value = ''
    }

    return (
        <div className="app-quick-titles flex justify-between items-start items-center gap-2 flex-wrap bg-gray-50 p-2 rounded">
            <div className="app-quick-title-list flex min-w-0 flex-wrap gap-2">
                {/* QuickTitle buttons */}
                {quickTitles.map((qt) => {
                    const isActive = normalizeQuickTitle(qt) === normalizedActiveQuickTitle

                    return (
                    <div
                        className={`app-quick-title flex max-w-full rounded-lg border overflow-hidden ${
                            isActive ? 'app-quick-title-active border-emerald-700 ring-2 ring-emerald-300' : 'border-blue-700'
                        }`}
                        key={qt}
                        title={qt.toUpperCase()}
                    >
                        <button
                            aria-pressed={isActive}
                            onClick={() => {
                                focusEditor()
                                onApplyPrefix(qt.toUpperCase())
                            }}
                            className={`app-button app-button-primary app-quick-title-button min-w-0 max-w-56 px-3 py-2 rounded text-sm text-white ${
                                isActive ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            <span className="block truncate">{qt.toUpperCase()}</span>
                        </button>
                        {editMode && (
                            <button
                                type="button"
                                aria-label={`Sterge prefixul ${qt}`}
                                title={`Sterge prefixul ${qt}`}
                                onClick={() => removeQuickTitle(qt)}
                                className="app-icon-button app-quick-title-delete px-2 text-sm hover:text-white hover:bg-red-700"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    )
                })}
            </div>


            {/* Add new quick title */}
            <input
                ref={inputRef}
                aria-label="Adaugă prefix nou"
                placeholder="Adaugă prefix nou..."
                className="app-input border border-gray-500 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreate()
                    }
                }}
            />
        </div>
    )
}
