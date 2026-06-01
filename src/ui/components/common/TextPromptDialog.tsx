// src/ui/components/common/TextPromptDialog.tsx
import { useEffect, useRef, useState } from 'react'

type Props = {
    open: boolean
    title: string
    description?: string
    placeholder?: string
    initialValue?: string
    confirmText?: string
    cancelText?: string
    onConfirm: (value: string) => void
    onClose: () => void
}

export function TextPromptDialog({
                                     open,
                                     title,
                                     description,
                                     placeholder,
                                     initialValue = '',
                                     confirmText = 'Salvează',
                                     cancelText = 'Anulează',
                                     onConfirm,
                                     onClose,
                                 }: Props) {
    const [value, setValue] = useState(initialValue)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!open) return
        setValue(initialValue)
        // focus după mount
        requestAnimationFrame(() => {
            inputRef.current?.focus()
            const len = inputRef.current?.value.length ?? 0
            inputRef.current?.setSelectionRange(len, len)
        })
    }, [open, initialValue])

    useEffect(() => {
        if (!open) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [open, onClose])

    if (!open) return null

    const submit = () => {
        onConfirm(value)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* overlay */}
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />

            {/* modal */}
            <div className="relative w-[520px] max-w-[92vw] rounded-lg bg-white shadow-xl border">
                <div className="px-4 py-3 border-b">
                    <div className="text-sm font-semibold">{title}</div>
                    {description && (
                        <div className="text-xs text-gray-500 mt-1">
                            {description}
                        </div>
                    )}
                </div>

                <div className="px-4 py-4">
                    <input
                        ref={inputRef}
                        value={value}
                        placeholder={placeholder}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                submit()
                            }
                        }}
                        className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                <div className="px-4 py-3 border-t flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 text-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={submit}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}