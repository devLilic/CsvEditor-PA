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

            {template.layers.map((layer) => (
                <details key={layer.id} className="rounded border bg-white">
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

