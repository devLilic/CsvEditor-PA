// src/ui/components/layout/EditorBody.tsx
import { useCallback, useEffect, useState } from 'react'
import { EntityList } from '../EntityList'
import { EntityEditor } from '../EntityEditor'
import { EntityTypeTabsLeft } from '../EntityTypeTabsLeft'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import type { AppConfig } from '@/shared/ipc-types'
import { useResizablePanel } from '@/ui/hooks/useResizablePanel'
import { useActiveEntityType, useEntities, useSelectedEntity } from '@/features/csv-editor'
import type { RepeatSupratitleRequest } from '../repeatSupratitle'

const DEFAULT_LEFT_PANEL_WIDTH = 700
const MIN_LEFT_PANEL_WIDTH = 420
const MAX_LEFT_PANEL_WIDTH = 1100
const RESIZER_WIDTH = 8

function clampPanelWidth(value: number) {
    return Math.min(MAX_LEFT_PANEL_WIDTH, Math.max(MIN_LEFT_PANEL_WIDTH, value))
}

function readSavedLeftPanelWidth(config: AppConfig): number | null {
    const layout = config.layout
    if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
        return null
    }

    const value = (layout as Record<string, unknown>).leftPanelWidth
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function createConfigWithLeftPanelWidth(config: AppConfig, leftPanelWidth: number): AppConfig {
    const layout = config.layout
    const safeLayout = layout && typeof layout === 'object' && !Array.isArray(layout)
        ? layout
        : {}

    return {
        ...config,
        layout: {
            ...safeLayout,
            leftPanelWidth,
        },
    }
}

export function EditorBody() {
    const [repeatSupratitleRequest, setRepeatSupratitleRequest] = useState<RepeatSupratitleRequest | null>(null)
    const { document: templateDocument } = useTemplateDocument()
    const { activeSection } = useEntities()
    const { activeEntityType, setActiveEntityType } = useActiveEntityType()
    const { clearSelection } = useSelectedEntity()
    const mainEntityTypes = activeSection?.kind === 'beta'
        ? ['titles', 'persons'] as const
        : ['titles', 'persons', 'locations', 'phoneCalls', 'waitTitles', 'waitLocations'] as const
    const availableMainEntityTypes = mainEntityTypes.filter((entityType) => (
        !(templateDocument.disabledEntityTypes ?? []).includes(entityType)
    ))
    const saveLeftPanelWidth = useCallback(async (nextWidth: number) => {
        const currentConfig = await settingsService.getConfig()
        await settingsService.setConfig(createConfigWithLeftPanelWidth(
            currentConfig,
            nextWidth,
        ))
    }, [])

    const handleResizeEnd = useCallback((width: number) => {
        void saveLeftPanelWidth(width)
    }, [saveLeftPanelWidth])

    const {
        width: leftPanelWidth,
        isResizing,
        setWidth: setLeftPanelWidth,
        startResize,
        resetWidth,
    } = useResizablePanel({
        defaultWidth: DEFAULT_LEFT_PANEL_WIDTH,
        minWidth: MIN_LEFT_PANEL_WIDTH,
        maxWidth: MAX_LEFT_PANEL_WIDTH,
        onResizeEnd: handleResizeEnd,
    })

    useEffect(() => {
        let isMounted = true

        settingsService.getConfig().then((config) => {
            if (!isMounted) return

            const savedWidth = readSavedLeftPanelWidth(config)
            if (savedWidth === null) return

            setLeftPanelWidth(clampPanelWidth(savedWidth))
        })

        return () => {
            isMounted = false
        }
    }, [setLeftPanelWidth])

    useEffect(() => {
        if (availableMainEntityTypes.length > 0 && !availableMainEntityTypes.includes(activeEntityType as typeof availableMainEntityTypes[number])) {
            clearSelection()
            setActiveEntityType(availableMainEntityTypes[0])
        }
    }, [activeEntityType, availableMainEntityTypes, clearSelection, setActiveEntityType])

    return (
        <div
            className={`app-body flex-1 grid gap-0 p-4 min-h-0 min-w-0 overflow-hidden ${
                isResizing ? 'select-none cursor-col-resize' : ''
            }`}
            style={{
                gridTemplateColumns: `${leftPanelWidth}px ${RESIZER_WIDTH}px minmax(0, 1fr)`,
            }}
        >
            {/* LEFT */}
            <div className="app-panel bg-white rounded border p-3 flex flex-col min-h-0 min-w-0">
                <div className="app-panel-divider pb-3 border-b">
                    <EntityTypeTabsLeft />
                </div>

                {/* IMPORTANT: min-h-0 + flex-1 ca să permită scroll intern */}
                <div className="pt-3 flex-1 min-h-0 min-w-0">
                    {availableMainEntityTypes.length > 0
                        ? <EntityList onRepeatSupratitle={setRepeatSupratitleRequest} />
                        : <div className="p-3 text-sm text-gray-600">Nu există elemente disponibile pentru această secțiune.</div>}
                </div>
            </div>

            <div
                role="separator"
                aria-orientation="vertical"
                onPointerDown={startResize}
                onDoubleClick={resetWidth}
                className="app-resizer group flex cursor-col-resize items-stretch justify-center px-1"
            >
                <div className="w-px bg-gray-300 group-hover:bg-blue-500" />
            </div>

            {/* RIGHT */}
            <div className="min-h-0 min-w-0 overflow-hidden">
                {availableMainEntityTypes.length > 0
                    ? <EntityEditor
                        repeatSupratitleRequest={repeatSupratitleRequest}
                        onRepeatSupratitleRequestHandled={(requestId) => {
                            setRepeatSupratitleRequest((current) => current?.requestId === requestId ? null : current)
                        }}
                    />
                    : <div className="flex h-full items-center justify-center rounded border bg-white p-4 text-center text-sm text-gray-600">
                        Nu există tipuri active pentru această secțiune. Activează un element din Emisiuni.
                    </div>}
            </div>
        </div>
    )
}
