type ImageFileSelectorProps = {
    label: string
    value: string
    onChange: (value: string) => void
}

function getSelectedFilePath(file: File | undefined): string {
    if (!file) return ''

    return (file as File & { path?: string }).path ?? file.name
}

export function ImageFileSelector({
    label,
    value,
    onChange,
}: ImageFileSelectorProps) {
    const fileInputId = useId()

    return (
        <div className="flex flex-col gap-1 text-xs font-medium text-gray-700">
            <span>{label}</span>
            <span className="flex gap-2">
                <input
                    aria-label={`${label} path`}
                    value={value}
                    readOnly
                    className="min-w-0 flex-1 rounded border border-gray-300 bg-gray-50 px-2 py-1 text-sm font-normal text-gray-900"
                />
                <label
                    htmlFor={fileInputId}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Alege imagine
                </label>
            </span>
            <input
                id={fileInputId}
                type="file"
                accept="image/*"
                aria-label={`${label} selector`}
                onChange={(event) => onChange(getSelectedFilePath(event.target.files?.[0]))}
                className="sr-only"
            />
        </div>
    )
}
import { useId } from 'react'
