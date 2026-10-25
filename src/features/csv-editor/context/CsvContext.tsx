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
    workingCopyError: string | null
    setWorkingCopyError(error: string | null): void
    retryInitialization(): void
    initializationAttempt: number
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
    const [workingCopyError, setWorkingCopyError] = React.useState<string | null>(null)
    const [initializationAttempt, setInitializationAttempt] = React.useState(0)

    const retryInitialization = React.useCallback(() => {
        setWorkingCopyError(null)
        setInitializationAttempt((current) => current + 1)
    }, [])

    return (
        <CsvContext.Provider value={{ state, dispatch, workingCopyError, setWorkingCopyError, retryInitialization, initializationAttempt }}>
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
