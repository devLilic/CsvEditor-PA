import { useMemo, useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mergeTedSampleData } from '@/features/template-editor/domain/tedSampleData'
import type { TedEntityType } from '@/features/template-editor/domain/tedTypes'
import { broadcastTemplates } from '@/templates/broadcast'
import { Preview16x9 } from '../preview16x9/Preview16x9'
import { TedSampleDataPanel } from './TedSampleDataPanel'

beforeEach(() => {
    class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
    }

    Object.defineProperty(window, 'ResizeObserver', {
        writable: true,
        configurable: true,
        value: ResizeObserverMock,
    })
})

afterEach(() => {
    cleanup()
})

function renderPanel(entityType: TedEntityType) {
    return render(
        <TedSampleDataPanel
            entityType={entityType}
            overrides={{}}
            onOverridesChange={vi.fn()}
        />
    )
}

describe('TedSampleDataPanel', () => {
    it.each([
        ['titles', ['title']],
        ['persons', ['name', 'occupation']],
        ['locations', ['location']],
        ['phoneCalls', ['name', 'occupation', 'image']],
    ] as const)('shows the sample fields for %s', (entityType, fieldIds) => {
        renderPanel(entityType)

        for (const fieldId of fieldIds) {
            expect(screen.getByLabelText(
                fieldId === 'image' ? 'image path' : fieldId
            )).toBeInTheDocument()
        }
        expect(screen.getAllByRole('textbox')).toHaveLength(fieldIds.length)
    })

    it('only reports local sample overrides when the user types', () => {
        const onOverridesChange = vi.fn()
        render(
            <TedSampleDataPanel
                entityType="persons"
                overrides={{ occupation: 'Reporter' }}
                onOverridesChange={onOverridesChange}
            />
        )

        fireEvent.change(screen.getByLabelText('name'), {
            target: { value: 'Ana Popescu' },
        })

        expect(onOverridesChange).toHaveBeenCalledWith({
            name: 'Ana Popescu',
            occupation: 'Reporter',
        })
    })

    it('selects the phone sample image as a real file path', () => {
        const onOverridesChange = vi.fn()
        const file = new File(['image'], 'phone.jpg', { type: 'image/jpeg' })
        Object.defineProperty(file, 'path', { value: 'C:\\PhoneImages\\phone.jpg' })
        render(
            <TedSampleDataPanel
                entityType="phoneCalls"
                overrides={{}}
                onOverridesChange={onOverridesChange}
            />
        )

        fireEvent.change(screen.getByLabelText('image selector'), {
            target: { files: [file] },
        })

        expect(onOverridesChange).toHaveBeenCalledWith({
            image: 'C:\\PhoneImages\\phone.jpg',
        })
    })

    it('updates Preview16x9 through sample data without changing the template', () => {
        const template = broadcastTemplates.titles

        function PreviewHarness() {
            const [overrides, setOverrides] = useState<Record<string, string>>({})
            const sampleData = useMemo(
                () => mergeTedSampleData('titles', overrides),
                [overrides],
            )

            return (
                <>
                    <TedSampleDataPanel
                        entityType="titles"
                        overrides={overrides}
                        onOverridesChange={setOverrides}
                    />
                    <Preview16x9 template={template} sampleData={sampleData} />
                </>
            )
        }

        render(<PreviewHarness />)
        fireEvent.change(screen.getByLabelText('title'), {
            target: { value: 'LIVE SAMPLE TITLE' },
        })

        expect(screen.getByText('LIVE SAMPLE TITLE')).toBeInTheDocument()
        expect(template.layers).toEqual(broadcastTemplates.titles.layers)
    })
})
