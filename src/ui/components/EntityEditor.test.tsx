import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EntityEditor } from './EntityEditor'
import { EditModeProvider } from '@/ui/context/EditModeContext'
import { TemplateDocumentProvider } from '@/features/template-editor/state/TemplateDocumentProvider'

const csvHooks = vi.hoisted(() => ({
    activeEntityType: 'titles' as
        | 'titles'
        | 'persons'
        | 'locations'
        | 'phoneCalls'
        | 'hotTitles'
        | 'waitTitles'
        | 'waitLocations',
    addEntity: vi.fn(),
    updateEntity: vi.fn(),
    clearSelection: vi.fn(),
    setActiveEntityType: vi.fn((type) => {
        csvHooks.activeEntityType = type
    }),
    selected: null as null | { sectionId: string; entityType: 'persons'; id: string },
    getBlockItems: vi.fn(() => []),
    phoneImageModalProps: null as any,
    quickTitles: [] as string[],
}))

const phoneImageServiceMock = vi.hoisted(() => ({
    loadPhoneImageDataUrl: vi.fn(),
    saveFinalPhoneImage: vi.fn(),
}))

vi.mock('@/features/csv-editor', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/features/csv-editor')>()

    return {
        ...actual,
        useEntities: () => ({
            activeSectionId: 'invited-1',
            activeSection: { id: 'invited-1', kind: 'invited', rows: [] },
            getBlockItems: csvHooks.getBlockItems,
            addEntity: csvHooks.addEntity,
            updateEntity: csvHooks.updateEntity,
        }),
        useSelectedEntity: () => ({
            selected: csvHooks.selected,
            clearSelection: csvHooks.clearSelection,
        }),
        useActiveEntityType: () => ({
            activeViewType: csvHooks.activeEntityType,
            setActiveViewType: csvHooks.setActiveEntityType,
            activeEntityType: csvHooks.activeEntityType,
            setActiveEntityType: csvHooks.setActiveEntityType,
        }),
        useQuickTitles: () => ({
            quickTitles: csvHooks.quickTitles,
            addQuickTitle: vi.fn(),
            removeQuickTitle: vi.fn(),
        }),
    }
})

vi.mock('@/features/csv-editor/services/phoneImageService', () => ({
    phoneImageService: {
        loadPhoneImageDataUrl: phoneImageServiceMock.loadPhoneImageDataUrl,
        saveFinalPhoneImage: phoneImageServiceMock.saveFinalPhoneImage,
    },
}))

vi.mock('./phone-image/PhoneImageModal', () => ({
    PhoneImageModal: (props: any) => {
        csvHooks.phoneImageModalProps = props
        return props.open ? (
            <div role="dialog" aria-label="Adaugă poză apel telefonic">
                <div>PhoneImageEditor mock</div>
                <button
                    type="button"
                    onClick={() => {
                        props.onSaved('C:\\PhoneImages\\test.jpg')
                        props.onClose()
                    }}
                >
                    mock image saved
                </button>
                <button
                    type="button"
                    onClick={() => {
                        props.onSaved('C:\\PhoneImages\\existing.jpg')
                        props.onClose()
                    }}
                >
                    mock existing image selected
                </button>
                <button type="button" onClick={props.onClose}>
                    mock modal close
                </button>
            </div>
        ) : null
    },
}))

beforeEach(() => {
    csvHooks.activeEntityType = 'titles'
    csvHooks.addEntity.mockClear()
    csvHooks.updateEntity.mockClear()
    csvHooks.clearSelection.mockClear()
    csvHooks.setActiveEntityType.mockClear()
    csvHooks.selected = null
    csvHooks.getBlockItems.mockReset()
    csvHooks.getBlockItems.mockReturnValue([])
    csvHooks.phoneImageModalProps = null
    csvHooks.quickTitles = []
    phoneImageServiceMock.loadPhoneImageDataUrl.mockReset()
    phoneImageServiceMock.loadPhoneImageDataUrl.mockResolvedValue({
        ok: true,
        dataUrl: 'data:image/jpeg;base64,preview',
    })
    phoneImageServiceMock.saveFinalPhoneImage.mockClear()

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

function renderEntityEditor() {
    return render(
        <TestProviders>
            <EntityEditor />
        </TestProviders>
    )
}

function TestProviders({ children }: { children: ReactNode }) {
    return (
        <EditModeProvider>
            <TemplateDocumentProvider>
                {children}
            </TemplateDocumentProvider>
        </EditModeProvider>
    )
}

describe('EntityEditor', () => {
    it('uses titleTemplate for titles', () => {
        const { container } = renderEntityEditor()

        expect(container.querySelector('[data-layer-id="title-main-text"]')).toBeInTheDocument()
        expect(container.querySelector('[data-layer-id="person-name-text"]')).not.toBeInTheDocument()
        expect(container.querySelector('[data-layer-id="location-text"]')).not.toBeInTheDocument()
    })

    it('uses personTemplate for persons', () => {
        csvHooks.activeEntityType = 'persons'
        const { container } = renderEntityEditor()

        expect(container.querySelector('[data-layer-id="person-name-text"]')).toBeInTheDocument()
        expect(container.querySelector('[data-layer-id="person-occupation-text"]')).toBeInTheDocument()
        expect(container.querySelector('[data-layer-id="title-main-text"]')).not.toBeInTheDocument()
    })

    it('uses locationTemplate for locations', () => {
        csvHooks.activeEntityType = 'locations'
        const { container } = renderEntityEditor()

        expect(container.querySelector('[data-layer-id="location-text"]')).toBeInTheDocument()
        expect(container.querySelector('[data-layer-id="title-main-text"]')).not.toBeInTheDocument()
        expect(container.querySelector('[data-layer-id="person-name-text"]')).not.toBeInTheDocument()
    })

    it('renders without crashing in a valid CSV context and shows the preview', () => {
        renderEntityEditor()

        expect(screen.getByTestId('entity-preview-container')).toHaveClass(
            'min-h-0',
            'min-w-0',
            'overflow-hidden'
        )
        expect(screen.getByTestId('preview16x9-root')).toBeInTheDocument()
        expect(screen.getByLabelText('Titlu')).toBeInTheDocument()
    })

    it('passes template and data to the new preview API', async () => {
        const user = userEvent.setup()
        const { container } = renderEntityEditor()

        expect(screen.getByTestId('preview16x9-root')).toBeInTheDocument()
        expect(container.querySelector('[data-layer-id="title-main-text"]')).toBeInTheDocument()
        expect(screen.getByText('TITLU')).toBeInTheDocument()

        await user.type(screen.getByLabelText('Titlu'), 'Breaking News')

        expect(screen.getByText('BREAKING NEWS')).toBeInTheDocument()
    })

    it('does not render the old Preview16x9 entityType/content/measureText UI', () => {
        renderEntityEditor()

        expect(screen.queryByText(/PREVIEW/i)).not.toBeInTheDocument()
    })

    it('allows filling the title input and enables Adauga when valid', async () => {
        const user = userEvent.setup()
        renderEntityEditor()

        const titleInput = screen.getByLabelText('Titlu')
        const addButton = screen.getByRole('button', { name: /Adaug/i })

        expect(addButton).toBeDisabled()

        await user.type(titleInput, 'Breaking News')

        expect(titleInput).toHaveValue('Breaking News')
        expect(screen.getByText('BREAKING NEWS')).toBeInTheDocument()
        expect(addButton).toBeEnabled()
    })

    it('inserts a quick title with colon-space and places the cursor after the space', async () => {
        csvHooks.quickTitles = ['breaking:']
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'BREAKING:' }))

        const titleInput = screen.getByLabelText('Titlu') as HTMLInputElement
        expect(titleInput).toHaveValue('BREAKING: ')
        expect(titleInput).toHaveFocus()
        expect(titleInput.selectionStart).toBe('BREAKING: '.length)
        expect(titleInput.selectionEnd).toBe('BREAKING: '.length)
    })

    it('saving a valid title calls addEntity with the active section and payload', async () => {
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Titlu'), 'Breaking News')
        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(csvHooks.addEntity).toHaveBeenCalledTimes(1)
        expect(csvHooks.addEntity).toHaveBeenCalledWith('invited-1', 'titles', {
            title: 'BREAKING NEWS',
        })
    })

    it('saving a valid person uses name and occupation fields', async () => {
        csvHooks.activeEntityType = 'persons'
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ana Popescu')
        await user.type(screen.getByLabelText('Funcție'), 'Reporter')

        expect(screen.getByText('ANA POPESCU')).toBeInTheDocument()
        expect(screen.getByText('Reporter')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(csvHooks.addEntity).toHaveBeenCalledTimes(1)
        expect(csvHooks.addEntity).toHaveBeenCalledWith('invited-1', 'persons', {
            name: 'ANA POPESCU',
            occupation: 'Reporter',
        })
    })

    it('in phoneCalls view shows name, occupation, and Add Photo button only', () => {
        csvHooks.activeEntityType = 'phoneCalls'

        const { container } = renderEntityEditor()

        expect(screen.getByLabelText('Nume')).toBeInTheDocument()
        expect(screen.getByLabelText(/Func/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Add Photo' })).toBeInTheDocument()
        expect(screen.queryByText('PhoneImageEditor mock')).not.toBeInTheDocument()
        expect(container.querySelector('[data-layer-id="phone-call-name-text"]')).toBeInTheDocument()
        expect(container.querySelector('[data-layer-id="person-name-text"]')).not.toBeInTheDocument()
    })

    it('opens and closes the phone image modal from Add Photo', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        const user = userEvent.setup()

        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'Add Photo' }))
        expect(screen.getByText('PhoneImageEditor mock')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'mock modal close' }))
        expect(screen.queryByText('PhoneImageEditor mock')).not.toBeInTheDocument()
    })

    it('passes suggested filename generated from person name to the photo modal', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        const user = userEvent.setup()

        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.click(screen.getByRole('button', { name: 'Add Photo' }))

        expect(csvHooks.phoneImageModalProps?.suggestedFilename).toBe('ion_popescu.jpg')
    })

    it('passes phone_call.jpg as suggested filename when name is empty', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        const user = userEvent.setup()

        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'Add Photo' }))

        expect(csvHooks.phoneImageModalProps?.suggestedFilename).toBe('phone_call.jpg')
    })

    it('blocks saving a phone call until an image is saved', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        const user = userEvent.setup()

        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')

        expect(screen.getByText('Adaugă o poză înainte de salvare.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Adaug/i })).toBeDisabled()
        expect(csvHooks.addEntity).not.toHaveBeenCalled()
    })

    it('creates a persons entity with image after PhoneImageEditor onSaved', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        const user = userEvent.setup()

        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.type(screen.getByLabelText(/Func/), 'Expert')
        await user.click(screen.getByRole('button', { name: 'Add Photo' }))
        await user.click(screen.getByRole('button', { name: 'mock image saved' }))

        expect(screen.queryByText('PhoneImageEditor mock')).not.toBeInTheDocument()
        expect(screen.getByText('Poză adăugată: test.jpg')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Change Photo' })).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(csvHooks.addEntity).toHaveBeenCalledWith('invited-1', 'persons', {
            name: 'ION POPESCU',
            occupation: 'Expert',
            image: 'C:\\PhoneImages\\test.jpg',
        })
    })

    it('uses an existing WORK_PATH image returned by PhoneImageModal without crop save', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        const user = userEvent.setup()

        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.type(screen.getByLabelText(/Func/), 'Expert')
        expect(screen.getByRole('button', { name: /Adaug/i })).toBeDisabled()

        await user.click(screen.getByRole('button', { name: 'Add Photo' }))
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'mock existing image selected' }))

        expect(screen.queryByText('PhoneImageEditor mock')).not.toBeInTheDocument()
        expect(screen.getByText(/existing\.jpg/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Change Photo' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Adaug/i })).toBeEnabled()
        expect(phoneImageServiceMock.saveFinalPhoneImage).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(csvHooks.addEntity).toHaveBeenCalledTimes(1)
        expect(csvHooks.addEntity).toHaveBeenCalledWith('invited-1', 'persons', {
            name: 'ION POPESCU',
            occupation: 'Expert',
            image: 'C:\\PhoneImages\\existing.jpg',
        })
        expect(phoneImageServiceMock.saveFinalPhoneImage).not.toHaveBeenCalled()
    })

    it('opens the same modal when changing an existing phone call photo', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        const user = userEvent.setup()

        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.click(screen.getByRole('button', { name: 'Add Photo' }))
        await user.click(screen.getByRole('button', { name: 'mock image saved' }))
        await user.click(screen.getByRole('button', { name: 'Change Photo' }))

        expect(screen.getByText('PhoneImageEditor mock')).toBeInTheDocument()
    })

    it('does not save a phone call before image modal saves successfully', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        const user = userEvent.setup()

        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')

        expect(screen.getByText('Adaugă o poză înainte de salvare.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Adaug/i })).toBeDisabled()
        expect(csvHooks.addEntity).not.toHaveBeenCalled()
    })

    it('updates a selected phone call person while preserving image behavior', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.selected = {
            sectionId: 'invited-1',
            entityType: 'persons',
            id: 'person-1',
        }
        csvHooks.getBlockItems.mockReturnValue([
            {
                entityType: 'persons',
                id: 'person-1',
                data: {
                    name: 'ION POPESCU',
                    occupation: 'Expert',
                    image: 'WORK_PATH/ion_popescu.jpg',
                },
            },
        ])
        const user = userEvent.setup()

        renderEntityEditor()

        expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled()
        await user.clear(screen.getByLabelText(/Func/))
        await user.type(screen.getByLabelText(/Func/), 'Analyst')
        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(csvHooks.updateEntity).toHaveBeenCalledWith('invited-1', 'persons', 'person-1', {
            name: 'ION POPESCU',
            occupation: 'Analyst',
            image: 'WORK_PATH/ion_popescu.jpg',
        })
    })

    it('edits an existing phone call person without creating a duplicate', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.selected = {
            sectionId: 'invited-1',
            entityType: 'persons',
            id: 'person-1',
        }
        csvHooks.getBlockItems.mockReturnValue([
            {
                entityType: 'persons',
                id: 'person-1',
                data: {
                    name: 'ION POPESCU',
                    occupation: 'Expert',
                    image: 'WORK_PATH/ion_popescu.jpg',
                },
            },
        ])
        const user = userEvent.setup()

        renderEntityEditor()

        await user.clear(screen.getByLabelText(/Func/))
        await user.type(screen.getByLabelText(/Func/), 'Consultant')
        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(csvHooks.addEntity).not.toHaveBeenCalled()
        expect(csvHooks.updateEntity).toHaveBeenCalledTimes(1)
        expect(csvHooks.updateEntity).toHaveBeenCalledWith('invited-1', 'persons', 'person-1', {
            name: 'ION POPESCU',
            occupation: 'Consultant',
            image: 'WORK_PATH/ion_popescu.jpg',
        })
        expect(csvHooks.setActiveEntityType).not.toHaveBeenCalled()
    })

    it('updates the real person image when changing photo from phoneCalls view', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.selected = {
            sectionId: 'invited-1',
            entityType: 'persons',
            id: 'person-1',
        }
        csvHooks.getBlockItems.mockReturnValue([
            {
                entityType: 'persons',
                id: 'person-1',
                data: {
                    name: 'ION POPESCU',
                    occupation: 'Expert',
                    image: 'WORK_PATH/old_photo.jpg',
                },
            },
        ])
        const user = userEvent.setup()

        renderEntityEditor()

        expect(screen.getByText('Poză adăugată: old_photo.jpg')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Change Photo' }))
        await user.click(screen.getByRole('button', { name: 'mock image saved' }))
        expect(screen.getByText('Poză adăugată: test.jpg')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(csvHooks.updateEntity).toHaveBeenCalledWith('invited-1', 'persons', 'person-1', {
            name: 'ION POPESCU',
            occupation: 'Expert',
            image: 'C:\\PhoneImages\\test.jpg',
        })
        expect(csvHooks.setActiveEntityType).not.toHaveBeenCalled()
    })

    it('saving a valid location uses the location field', async () => {
        csvHooks.activeEntityType = 'locations'
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Locație'), 'Chișinău')
        expect(screen.getByText('CHIȘINĂU')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(csvHooks.addEntity).toHaveBeenCalledTimes(1)
        expect(csvHooks.addEntity).toHaveBeenCalledWith('invited-1', 'locations', {
            location: 'CHIȘINĂU',
        })
    })

    it('does not render form inputs for unsupported hot or wait entity types', () => {
        csvHooks.activeEntityType = 'hotTitles'
        const { rerender } = renderEntityEditor()

        expect(screen.queryByLabelText('Titlu')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Nume')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Locație')).not.toBeInTheDocument()

        csvHooks.activeEntityType = 'waitLocations'
        rerender(
            <TestProviders>
                <EntityEditor />
            </TestProviders>
        )

        expect(screen.queryByLabelText('Titlu')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Nume')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Locație')).not.toBeInTheDocument()
    })

    it('does not use dedicated templates for hot or wait entity types', () => {
        csvHooks.activeEntityType = 'hotTitles'
        const { container, rerender } = renderEntityEditor()

        expect(container.querySelector('[data-layer-id="title-main-text"]')).toBeInTheDocument()
        expect(container.innerHTML).not.toMatch(/hot|wait/i)

        csvHooks.activeEntityType = 'waitTitles'
        rerender(
            <TestProviders>
                <EntityEditor />
            </TestProviders>
        )

        expect(container.querySelector('[data-layer-id="title-main-text"]')).toBeInTheDocument()
        expect(container.innerHTML).not.toMatch(/hot|wait/i)

        csvHooks.activeEntityType = 'waitLocations'
        rerender(
            <TestProviders>
                <EntityEditor />
            </TestProviders>
        )

        expect(container.querySelector('[data-layer-id="title-main-text"]')).toBeInTheDocument()
        expect(container.innerHTML).not.toMatch(/hot|wait/i)
    })

    it('changing the active entity type does not crash', () => {
        const { rerender } = render(
            <TestProviders>
                <EntityEditor />
            </TestProviders>
        )

        csvHooks.activeEntityType = 'persons'
        rerender(
            <TestProviders>
                <EntityEditor />
            </TestProviders>
        )

        expect(screen.getByLabelText('Nume')).toBeInTheDocument()
        expect(screen.getByTestId('preview16x9-root')).toBeInTheDocument()
    })
})
