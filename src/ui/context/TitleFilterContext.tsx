import { createContext, useContext, useState } from 'react'

interface TitleFilterContextValue {
    titleFilter: string
    setTitleFilter: (value: string) => void
}

const TitleFilterContext = createContext<TitleFilterContextValue | null>(null)

export function TitleFilterProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [titleFilter, setTitleFilter] = useState('')

    return (
        <TitleFilterContext.Provider value={{ titleFilter, setTitleFilter }}>
            {children}
        </TitleFilterContext.Provider>
    )
}

export function useTitleFilter() {
    const ctx = useContext(TitleFilterContext)
    if (!ctx) {
        throw new Error(
            'useTitleFilter must be used inside TitleFilterProvider'
        )
    }

    return ctx
}
