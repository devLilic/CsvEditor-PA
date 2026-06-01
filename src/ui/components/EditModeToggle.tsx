// src/ui/components/EditModeToggle.tsx
import { useEditMode } from '@/ui/context/EditModeContext'
import { useTedMode } from '@/ui/context/TedModeContext'

export function EditModeToggle() {
    const { editMode, toggleEditMode } = useEditMode()
    const { isTedMode } = useTedMode()

    return (
        <button
            onClick={toggleEditMode}
            disabled={isTedMode}
            className={`px-3 py-1 rounded text-sm font-medium border
        ${editMode
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-gray-700 border-gray-300'}
        ${isTedMode ? 'cursor-not-allowed opacity-60' : ''}
      `}
        >
            ✏️ Edit Mode {editMode ? 'ON' : 'OFF'}
        </button>
    )
}
