// features/csv-editor/context/CsvContext.tsx

import React, {
    createContext,
    useContext,
    useReducer,
    ReactNode,
} from 'react'

import {
    csvReducer,
} from '../state/csv.reducer'

import {
    CsvState,
    CsvAction,
    initialCsvState,
} from '../state/csv.types'

/**
 * Contractul expus către UI
 * ❌ UI NU vede reducerul
 * ❌ UI NU vede dispatch direct
 */
interface CsvContextValue {
    state: CsvState
    dispatch: React.Dispatch<CsvAction>
}

const CsvContext = createContext<CsvContextValue | null>(null)

/**
 * Provider subțire
 * - gestionează DOAR state + reducer
 * - side-effects sunt în hooks
 */
export function CsvProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(
        csvReducer,
        initialCsvState
    )

    return (
        <CsvContext.Provider value={{ state, dispatch }}>
    {children}
    </CsvContext.Provider>
)
}

/**
 * Hook intern de acces la context
 * (NU va fi folosit direct de UI)
 */
export function useCsvContext() {
    const ctx = useContext(CsvContext)
    if (!ctx) {
        throw new Error(
            'useCsvContext must be used inside CsvProvider'
        )
    }
    return ctx
}
