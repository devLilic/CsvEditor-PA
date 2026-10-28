import type { BroadcastTemplate } from './templateContract'

export function getTemplateInputFields(template: BroadcastTemplate) {
    const labels: Record<string, string> = {
        title: 'Titlu', name: 'Nume', occupation: 'Funcție', location: 'Locație',
    }
    const fields: Array<{ fieldId: string; label: string }> = []
    for (const layer of template.layers) {
        if (layer.type !== 'text' || layer.visible === false) continue
        for (const fieldId of [layer.fieldId, ...(layer.textParts ?? []).map((part) => part.fieldId)]) {
            const label = fieldId === layer.fieldId
                ? layer.inputLabel !== undefined ? layer.inputLabel.trim() : labels[fieldId]
                : labels[fieldId]
            if (!fieldId.trim() || !label || fields.some((field) => field.fieldId === fieldId)) continue
            fields.push({ fieldId, label })
        }
    }
    fields.sort((a, b) => a.fieldId === 'supratitle' ? -1 : b.fieldId === 'supratitle' ? 1 : 0)
    const order = template.inputOrder ?? []
    const rank = (id: string) => order.includes(id) ? order.indexOf(id) : order.length
    return fields.sort((a, b) => rank(a.fieldId) - rank(b.fieldId))
}
