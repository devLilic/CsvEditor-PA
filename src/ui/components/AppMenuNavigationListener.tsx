// src/ui/components/AppMenuNavigationListener.tsx

import {useEffect} from 'react'
import {useNavigate} from 'react-router-dom'
import type { RendererApi } from '@/shared/ipc-types'

function getElectronApi(): RendererApi | undefined {
    return (window as Window & { electronAPI?: RendererApi }).electronAPI
}

export function AppMenuNavigationListener() {
    const navigate = useNavigate()

    useEffect(() => {
        return getElectronApi()?.onMenuNavigate?.((route) => {
            if (route === '/settings/default-project') {
                navigate(route)
            }
        })
    }, [navigate])

    return null
}
