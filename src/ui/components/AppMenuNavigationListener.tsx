// src/ui/components/AppMenuNavigationListener.tsx

import {useEffect} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'
import type { RendererApi } from '@/shared/ipc-types'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'

function getElectronApi(): RendererApi | undefined {
    return (window as Window & { electronAPI?: RendererApi }).electronAPI
}

export function AppMenuNavigationListener() {
    const navigate = useNavigate()
    const location = useLocation()
    const { flushWorkingCopy, guardAdminNavigation } = useTemplateDocument()

    const openEditionMenuAction = (action: 'open-saved-editions' | 'save-edition') => {
        const dispatchAction = () => window.dispatchEvent(new Event(
            action === 'open-saved-editions' ? 'tales:open-saved-editions' : 'tales:save-edition',
        ))
        if (location.pathname === '/csv-editor') {
            dispatchAction()
            return
        }
        void (async () => {
            const allowed = await guardAdminNavigation('/csv-editor')
            if (!allowed) return
            const result = await flushWorkingCopy()
            if (!result.ok) return
            navigate('/csv-editor')
            window.setTimeout(dispatchAction, 0)
        })()
    }

    useEffect(() => {
        return getElectronApi()?.onMenuNavigate?.((route) => {
            if (route === 'open-saved-editions' || route === 'save-edition') {
                openEditionMenuAction(route)
                return
            }
            if (route === '/csv-editor' || route === '/settings/default-project' || route === '/settings/application' || route === '/shows') {
                void guardAdminNavigation(route).then(async (allowed) => {
                    if (!allowed) return
                    const result = await flushWorkingCopy()
                    if (result.ok) navigate(route)
                })
            }
        })
    }, [flushWorkingCopy, guardAdminNavigation, location.pathname, navigate])

    return null
}
