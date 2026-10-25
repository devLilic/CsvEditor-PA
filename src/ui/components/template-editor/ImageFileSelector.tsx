import { useId } from 'react'

type ImageFileSelectorProps = {
    label: string
    value: string
    onChange: (value: string) => void
}

function readFileAsDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
        reader.onerror = () => resolve('')
        reader.readAsDataURL(file)
    })
}

async function getSelectedFileValue(file: File | undefined): Promise<string> {
    if (!file) return Promise.resolve('')

    const filePath = (file as File & { path?: string }).path
    if (filePath) return Promise.resolve(filePath)

    // Browser File objects do not expose Electron's `path` property. Persist
    // their contents as a data URL instead of saving a bare filename or an
    // object URL, both of which stop resolving after the dialog/reload.
    return readFileAsDataUrl(file)
}

function displayImageValue(value: string): string {
    if (!value) return ''
    if (/^data:image\//i.test(value)) return 'Embedded image'

    const normalized = value.replace(/[\\/]+$/, '').replace(/\\/g, '/')
    const filename = normalized.split('/').pop() ?? value
    const display = filename || value
    return display.length > 96 ? `${display.slice(0, 45)}…${display.slice(-48)}` : display
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
                    value={displayImageValue(value)}
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
                onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    // Clearing the input lets the operator select the same image
                    // again for another template variant and still emit `change`.
                    event.currentTarget.value = ''
                    void getSelectedFileValue(file).then(onChange)
                }}
                className="sr-only"
            />
        </div>
    )
}
