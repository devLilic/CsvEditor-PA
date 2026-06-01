// src/ui/components/common/InputField.tsx
import { RefObject, KeyboardEvent } from 'react'

interface InputFieldProps {
    label: string
    value: string
    placeholder?: string
    onChange: (v: string) => void
    onEnter?: () => void
    inputRef?: RefObject<HTMLInputElement>
    uppercase?: boolean
    invalid?: boolean
}

export function InputField({
                               label,
                               value,
                               placeholder,
                               onChange,
                               onEnter,
                               inputRef,
                               uppercase = false,
                               invalid = false,
                           }: InputFieldProps) {
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onEnter) {
            e.preventDefault()
            onEnter()
        }
    }

    return (
        <label className="flex flex-col gap-1">
      <span className="text-sm text-gray-600">
        {label}
      </span>
            <input
                ref={inputRef}
                value={value}
                spellCheck={true}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`
                ${uppercase ? 'uppercase' : ''}
          border px-3 py-2 rounded text-2xl focus:outline-none focus:ring-2
          ${invalid
                    ? 'border-red-500 focus:ring-red-400 animate-shake'
                    : 'border-gray-300 focus:ring-blue-500'}
        `}
            />
        </label>
    )
}
