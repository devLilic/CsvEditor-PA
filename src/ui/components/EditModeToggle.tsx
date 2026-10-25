// src/ui/components/EditModeToggle.tsx
import { useEditMode } from '@/ui/context/EditModeContext'

export function EditModeToggle() {
    const { editMode, toggleEditMode } = useEditMode()

    return (
        <button
            onClick={toggleEditMode}
            className={`px-3 py-1 rounded text-sm font-medium border
        ${editMode
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-gray-700 border-gray-300'}
      `}
        >
            ✏️ Edit Mode {editMode ? 'ON' : 'OFF'}
        </button>
    )
}
