import { FormEvent, useEffect, useRef, useState } from 'react'

export type PersonQuickTitleDialogProps = {
    open: boolean
    initialValue: string
    personName: string
    isSaving?: boolean
    error?: string
    onSave: (value: string) => void
    onCancel: () => void
}

export function PersonQuickTitleDialog({
    open,
    initialValue,
    personName,
    isSaving = false,
    error,
    onSave,
    onCancel,
}: PersonQuickTitleDialogProps) {
    const [value, setValue] = useState(initialValue)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!open) return

        setValue(initialValue)
        requestAnimationFrame(() => {
            inputRef.current?.focus()
            inputRef.current?.select()
        })
    }, [initialValue, open])

    useEffect(() => {
        if (!open) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onCancel()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onCancel, open])

    if (!open) {
        return null
    }

    const trimmedValue = value.trim()
    const canSave = trimmedValue.length > 0 && !isSaving

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!canSave) return

        onSave(trimmedValue)
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-quick-title-dialog-title"
            aria-describedby="person-quick-title-dialog-description"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl"
            >
                <div className="border-b border-gray-200 px-4 py-3">
                    <h2 id="person-quick-title-dialog-title" className="text-sm font-semibold text-gray-900">
                        Prefix persoană
                    </h2>
                </div>

                <div className="space-y-4 px-4 py-4">
                    <div id="person-quick-title-dialog-description" className="space-y-2 text-sm text-gray-700">
                        <p>Persoana a fost salvată.</p>
                        <p>Dorești să creezi și un prefix pentru această persoană?</p>
                    </div>

                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">
                            Prefix pentru {personName}
                        </span>
                        <input
                            ref={inputRef}
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            disabled={isSaving}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </label>

                    {error && (
                        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!canSave}
                        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                        Save
                    </button>
                </div>
            </form>
        </div>
    )
}
