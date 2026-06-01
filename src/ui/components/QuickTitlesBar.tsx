// src/ui/components/QuickTitlesBar.tsx
import {useRef} from 'react'
import {useQuickTitles} from '@/features/csv-editor'
import {useEditMode} from "@/ui/context/EditModeContext";

interface QuickTitlesBarProps {
    onApplyPrefix: (prefix: string) => void
    focusEditor: () => void
}

export function normalizeQuickTitle(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return ''

    return trimmed.endsWith(':') ? trimmed : `${trimmed}:`
}

export function QuickTitlesBar({
                                   onApplyPrefix,
                                   focusEditor,
                               }: QuickTitlesBarProps) {
    const {
        quickTitles,
        addQuickTitle,
        removeQuickTitle,
    } = useQuickTitles()
    const {editMode} = useEditMode()


    const inputRef = useRef<HTMLInputElement>(null)

    const handleCreate = async () => {
        const value = normalizeQuickTitle(inputRef.current?.value ?? '')
        if (!value) return

        await addQuickTitle(value)
        inputRef.current!.value = ''
    }

    return (
        <div className="flex justify-between items-start items-center gap-2 flex-wrap bg-gray-50 p-2 rounded">
            <div className="flex gap-2">
                {/* QuickTitle buttons */}
                {quickTitles.map((qt) => (
                    <div className="flex rounded-lg border border-blue-700 overflow-hidden" key={qt}>
                        <button
                            onClick={() => {
                                onApplyPrefix(qt)
                                focusEditor()
                            }}
                            className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                        >
                            {qt.toUpperCase()}
                        </button>
                        {editMode && (
                            <button
                                onClick={() => removeQuickTitle(qt)}
                                className="px-2 text-sm hover:text-white hover:bg-red-700"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>


            {/* Add new quick title */}
            <input
                ref={inputRef}
                placeholder="Adaugă prefix nou..."
                className="border border-gray-500 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
