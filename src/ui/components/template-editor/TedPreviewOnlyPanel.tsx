import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import { Preview16x9 } from '../preview16x9/Preview16x9'

type TedPreviewOnlyPanelProps = {
    template: BroadcastTemplate
    sampleData: Record<string, string>
}

export function TedPreviewOnlyPanel({
    template,
    sampleData,
}: TedPreviewOnlyPanelProps) {
    return (
        <div
            data-testid="ted-preview-only-panel"
            className="min-h-0 min-w-0 overflow-hidden rounded border bg-white p-4"
        >
            <Preview16x9
                template={template}
                sampleData={sampleData}
                fitMode="width"
                maxHeight={700}
            />
        </div>
    )
}
