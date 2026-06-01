import { createContext, useContext, useEffect, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { TedEntityType } from '@/features/template-editor/domain/tedTypes'
import { useEditMode } from './EditModeContext'

type TedModeContextValue = {
    isTedMode: boolean
    setTedMode: (isTedMode: boolean) => void
    toggleTedMode: () => void
    activeTedEntityType: TedEntityType
    setActiveTedEntityType: (entityType: TedEntityType) => void
    tedSampleOverrides: Record<string, string>
    setTedSampleOverrides: Dispatch<SetStateAction<Record<string, string>>>
}

const TedModeContext = createContext<TedModeContextValue | null>(null)

export function TedModeProvider({ children }: { children: ReactNode }) {
    const { editMode, setEditMode } = useEditMode()
    const [isTedMode, setIsTedMode] = useState(false)
    const [activeTedEntityType, setActiveTedEntityType] = useState<TedEntityType>('titles')
    const [tedSampleOverrides, setTedSampleOverrides] = useState<Record<string, string>>({})

    useEffect(() => {
        if (isTedMode && !editMode) {
            setEditMode(true)
        }
    }, [editMode, isTedMode, setEditMode])

    const setTedMode = (nextIsTedMode: boolean) => {
        setIsTedMode(nextIsTedMode)
        if (nextIsTedMode) {
            setEditMode(true)
        }
    }

    const toggleTedMode = () => {
        setTedMode(!isTedMode)
    }

    return (
        <TedModeContext.Provider
            value={{
                isTedMode,
                setTedMode,
                toggleTedMode,
                activeTedEntityType,
                setActiveTedEntityType,
                tedSampleOverrides,
                setTedSampleOverrides,
            }}
        >
            {children}
        </TedModeContext.Provider>
    )
}

export function useTedMode() {
    const context = useContext(TedModeContext)
    if (!context) {
        throw new Error('useTedMode must be used inside TedModeProvider')
    }

    return context
}
