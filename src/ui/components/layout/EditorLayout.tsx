// src/ui/components/layout/EditorLayout.tsx
import { ReactNode } from 'react'

export function EditorLayout({ children }: { children: ReactNode }) {
    return (
        <div className="h-screen w-full flex flex-col bg-slate-100">
            {children}
        </div>
    )
}
