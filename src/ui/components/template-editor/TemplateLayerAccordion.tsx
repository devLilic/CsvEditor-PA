import { useState } from 'react'
import type {
    BroadcastLayer,
    BroadcastTemplate,
} from '@/shared/preview/templateContract'
import { BackgroundFieldsEditor } from './BackgroundFieldsEditor'
import { ImageLayerFieldsEditor } from './ImageLayerFieldsEditor'
import { LayerBaseFieldsEditor } from './LayerBaseFieldsEditor'
import { ShapeLayerFieldsEditor } from './ShapeLayerFieldsEditor'
import { TextLayerFieldsEditor } from './TextLayerFieldsEditor'
import { NumericInputWithSlider } from './NumericInputWithSlider'

type TemplateLayerAccordionProps = {
    template: BroadcastTemplate
    onTemplateChange: (template: BroadcastTemplate) => void
}

function cloneTemplate(template: BroadcastTemplate): BroadcastTemplate {
    return JSON.parse(JSON.stringify(template)) as BroadcastTemplate
}

function cloneValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

function updateLayerById(
    template: BroadcastTemplate,
    layerId: string,
    updateLayer: (layer: BroadcastLayer) => BroadcastLayer
) {
    return {
        ...template,
        layers: template.layers.map((layer) => (
            layer.id === layerId ? updateLayer(layer) : layer
        )),
    }
}

export function TemplateLayerAccordion({
    template,
    onTemplateChange,
}: TemplateLayerAccordionProps) {
    const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null)

    const applyTemplateUpdate = (nextTemplate: BroadcastTemplate) => {
        onTemplateChange(nextTemplate)
    }

    const updateCanvasNumber = (key: 'width' | 'height', value: number) => {
        applyTemplateUpdate({
            ...cloneTemplate(template),
            canvas: {
                ...cloneValue(template.canvas),
                [key]: value,
            },
        })
    }

    const updateLayer = (
        layerId: string,
        updateLayerValue: (layer: BroadcastLayer) => BroadcastLayer
    ) => {
        applyTemplateUpdate(updateLayerById(cloneTemplate(template), layerId, updateLayerValue))
    }

    const nextLayerId = (prefix: string) => {
        const existingIds = new Set(template.layers.map((layer) => layer.id))
        let suffix = 1
        while (existingIds.has(`${prefix}-${suffix}`)) suffix += 1
        return `${prefix}-${suffix}`
    }

    const addTextLayer = () => {
        const id = nextLayerId('custom-text')
        const layer = {
            id,
            type: 'text' as const,
            x: 40,
            y: 40,
            width: Math.max(1, template.canvas.width - 80),
            height: 96,
            zIndex: Math.max(0, ...template.layers.map((item) => item.zIndex)) + 1,
            fieldId: '',
            fallbackText: 'New text',
            fieldDefaultValue: 'New text',
            textStyle: {
                fontFamily: 'Arial',
                fontSize: 48,
                fontWeight: 700,
                color: '#ffffff',
                align: 'left' as const,
            },
        }
        applyTemplateUpdate({ ...cloneTemplate(template), layers: [...template.layers, layer] })
        setExpandedLayerId(id)
    }

    const addShapeLayer = () => {
        const id = nextLayerId('custom-shape')
        const layer = {
            id,
            type: 'shape' as const,
            x: 40,
            y: 40,
            width: Math.max(1, template.canvas.width - 80),
            height: 120,
            zIndex: Math.min(0, ...template.layers.map((item) => item.zIndex)) - 1,
            shapeType: 'rect' as const,
            fill: { type: 'solid' as const, value: '#1f2937' },
            borderRadius: 0,
        }
        applyTemplateUpdate({ ...cloneTemplate(template), layers: [...template.layers, layer] })
        setExpandedLayerId(id)
    }

    return (
        <div className="flex flex-col gap-3">
            <details open className="rounded border bg-white">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-gray-900">
                    Background
                </summary>
                <div className="grid grid-cols-2 gap-2 border-t p-3">
                    <NumericInputWithSlider
                        label="Width"
                        value={template.canvas.width}
                        min={1}
                        onChange={(value) => updateCanvasNumber('width', value)}
                    />
                    <NumericInputWithSlider
                        label="Height"
                        value={template.canvas.height}
                        min={1}
                        onChange={(value) => updateCanvasNumber('height', value)}
                    />
                    <BackgroundFieldsEditor
                        background={template.canvas.background}
                        onChange={(background) => applyTemplateUpdate({
                            ...cloneTemplate(template),
                            canvas: {
                                ...cloneValue(template.canvas),
                                background,
                            },
                        })}
                    />
                </div>
            </details>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={addTextLayer}
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                    Add text layer
                </button>
                <button
                    type="button"
                    onClick={addShapeLayer}
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                    Add shape layer
                </button>
            </div>

            {template.layers.map((layer) => (
                <details
                    key={layer.id}
                    open={expandedLayerId === layer.id}
                    onToggle={(event) => {
                        const isOpen = event.currentTarget.open
                        setExpandedLayerId((currentId) => (
                            isOpen
                                ? layer.id
                                : currentId === layer.id ? null : currentId
                        ))
                    }}
                    className="rounded border bg-white"
                >
                    <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-gray-900">
                        {layer.id} ({layer.type})
                    </summary>
                    <div className="grid grid-cols-2 gap-2 border-t p-3">
                        <LayerBaseFieldsEditor
                            layer={layer}
                            onChange={(nextLayer) => updateLayer(layer.id, () => nextLayer)}
                        />
                        {layer.type === 'text' && (
                            <TextLayerFieldsEditor
                                layer={layer}
                                onChange={(nextLayer) => updateLayer(layer.id, () => nextLayer)}
                            />
                        )}
                        {layer.type === 'image' && (
                            <ImageLayerFieldsEditor
                                layer={layer}
                                onChange={(nextLayer) => updateLayer(layer.id, () => nextLayer)}
                            />
                        )}
                        {layer.type === 'shape' && (
                            <ShapeLayerFieldsEditor
                                layer={layer}
                                onChange={(nextLayer) => updateLayer(layer.id, () => nextLayer)}
                            />
                        )}
                    </div>
                </details>
            ))}
        </div>
    )
}

