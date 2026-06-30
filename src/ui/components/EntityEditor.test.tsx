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
    activeSectionId: 'invited-1' as string | null,
    activeSection: { id: 'invited-1', kind: 'invited', rows: [] } as any,
    addEntity: vi.fn(),
    updateEntity: vi.fn(),
    savePersonEntity: vi.fn(),
    clearSelection: vi.fn(),
    setActiveEntityType: vi.fn((type) => {
        csvHooks.activeEntityType = type
    }),
    selected: null as null | { sectionId: string; entityType: 'persons'; id: string },
    getBlockItems: vi.fn(() => []),
    phoneImageModalProps: null as any,
    quickTitles: [] as string[],
    setAllQuickTitles: vi.fn(),
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
            activeSectionId: csvHooks.activeSectionId,
            activeSection: csvHooks.activeSection,
            getBlockItems: csvHooks.getBlockItems,
            addEntity: csvHooks.addEntity,
            updateEntity: csvHooks.updateEntity,
            savePersonEntity: csvHooks.savePersonEntity,
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
            setAllQuickTitles: csvHooks.setAllQuickTitles,
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
    csvHooks.activeSectionId = 'invited-1'
    csvHooks.activeSection = { id: 'invited-1', kind: 'invited', rows: [] }
    csvHooks.addEntity.mockClear()
    csvHooks.updateEntity.mockClear()
    csvHooks.savePersonEntity.mockReset()
    csvHooks.savePersonEntity.mockResolvedValue({ ok: true })
    csvHooks.clearSelection.mockClear()
    csvHooks.setActiveEntityType.mockClear()
    csvHooks.selected = null
    csvHooks.getBlockItems.mockReset()
    csvHooks.getBlockItems.mockReturnValue([])
    csvHooks.phoneImageModalProps = null
    csvHooks.quickTitles = []
    csvHooks.setAllQuickTitles.mockReset()
    csvHooks.setAllQuickTitles.mockResolvedValue(undefined)
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

        expect(csvHooks.savePersonEntity).toHaveBeenCalledTimes(1)
        expect(csvHooks.savePersonEntity).toHaveBeenCalledWith({
            sectionId: 'invited-1',
            id: undefined,
            data: {
                name: 'ANA POPESCU',
                occupation: 'Reporter',
            },
        })
    })

    it('opens quick title modal after successful manual person create in invited section', async () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.quickTitles = ['POPESCU']
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.type(screen.getByLabelText(/Func/), 'Reporter')
        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(await screen.findByRole('dialog', { name: /Prefix/ })).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: 'Prefix pentru ION POPESCU' })).toHaveValue('I. POPESCU')
    })

    it('keeps quick title modal closed when manual person create fails', async () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.savePersonEntity.mockResolvedValueOnce({ ok: false, error: 'WRITE_FAILED' })
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.type(screen.getByLabelText(/Func/), 'Reporter')
        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(screen.queryByRole('dialog', { name: /Prefix/ })).not.toBeInTheDocument()
        expect(consoleErrorSpy).toHaveBeenCalledWith('Person save failed:', 'WRITE_FAILED')
    })

    it('keeps quick title modal closed when creating a person in beta', async () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.activeSectionId = 'beta-1'
        csvHooks.activeSection = { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Externe', rows: [] }
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.type(screen.getByLabelText(/Func/), 'Reporter')
        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(screen.queryByRole('dialog', { name: /Prefix/ })).not.toBeInTheDocument()
    })

    it('keeps quick title modal closed when creating a phone call', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.type(screen.getByLabelText(/Func/), 'Expert')
        await user.click(screen.getByRole('button', { name: 'Add Photo' }))
        await user.click(screen.getByRole('button', { name: 'mock image saved' }))
        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(screen.queryByRole('dialog', { name: /Prefix/ })).not.toBeInTheDocument()
        expect(csvHooks.addEntity).toHaveBeenCalledWith('invited-1', 'persons', {
            name: 'ION POPESCU',
            occupation: 'Expert',
            image: 'C:\\PhoneImages\\test.jpg',
        })
    })

    it('opens quick title modal after successful manual person edit in invited section', async () => {
        csvHooks.activeEntityType = 'persons'
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
                    occupation: 'Reporter',
                },
            },
        ])
        csvHooks.quickTitles = ['POPESCU']
        const user = userEvent.setup()
        renderEntityEditor()

        await user.clear(screen.getByLabelText(/Func/))
        await user.type(screen.getByLabelText(/Func/), 'Editor')
        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(csvHooks.savePersonEntity).toHaveBeenCalledWith({
            sectionId: 'invited-1',
            id: 'person-1',
            data: {
                name: 'ION POPESCU',
                occupation: 'Editor',
                image: '',
            },
        })
        expect(await screen.findByRole('dialog', { name: /Prefix/ })).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: 'Prefix pentru ION POPESCU' })).toHaveValue('I. POPESCU')
    })

    it('saves quick title from modal and closes it after persistence succeeds', async () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.quickTitles = ['POPESCU: ']
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.type(screen.getByLabelText(/Func/), 'Reporter')
        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        const dialog = await screen.findByRole('dialog', { name: /Prefix/ })
        expect(dialog).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Save' }))

        expect(csvHooks.setAllQuickTitles).toHaveBeenCalledWith([
            'POPESCU: ',
            'I. POPESCU: ',
        ])
        expect(screen.queryByRole('dialog', { name: /Prefix/ })).not.toBeInTheDocument()
    })

    it('suggests BUJOR when creating ANA BUJOR without existing quick titles', async () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.quickTitles = []
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ana Bujor')
        await user.type(screen.getByLabelText(/Func/), 'Reporter')
        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(await screen.findByRole('textbox', { name: 'Prefix pentru ANA BUJOR' })).toHaveValue('BUJOR')
    })

    it('creates BUJOR: when saving the ANA BUJOR suggestion', async () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.quickTitles = []
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ana Bujor')
        await user.type(screen.getByLabelText(/Func/), 'Reporter')
        await user.click(screen.getByRole('button', { name: /Adaug/i }))
        await screen.findByRole('textbox', { name: 'Prefix pentru ANA BUJOR' })
        await user.click(screen.getByRole('button', { name: 'Save' }))

        expect(csvHooks.setAllQuickTitles).toHaveBeenCalledWith(['BUJOR: '])
    })

    it('suggests I. BUJOR when creating IGOR BUJOR and BUJOR already exists', async () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.quickTitles = ['BUJOR: ']
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Igor Bujor')
        await user.type(screen.getByLabelText(/Func/), 'Reporter')
        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(await screen.findByRole('textbox', { name: 'Prefix pentru IGOR BUJOR' })).toHaveValue('I. BUJOR')
    })

    it('suggests POPESCU when editing a person to MARIA POPESCU without existing POPESCU', async () => {
        csvHooks.activeEntityType = 'persons'
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
                    name: 'ANA BUJOR',
                    occupation: 'Reporter',
                },
            },
        ])
        csvHooks.quickTitles = ['BUJOR: ']
        const user = userEvent.setup()
        renderEntityEditor()

        await user.clear(screen.getByLabelText('Nume'))
        await user.type(screen.getByLabelText('Nume'), 'Maria Popescu')
        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(await screen.findByRole('textbox', { name: 'Prefix pentru MARIA POPESCU' })).toHaveValue('POPESCU')
    })

    it('suggests POPESCU-IONESCU when editing a person to ION POPESCU-IONESCU', async () => {
        csvHooks.activeEntityType = 'persons'
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
                    name: 'ANA BUJOR',
                    occupation: 'Reporter',
                },
            },
        ])
        const user = userEvent.setup()
        renderEntityEditor()

        await user.clear(screen.getByLabelText('Nume'))
        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu-Ionescu')
        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(await screen.findByRole('textbox', { name: 'Prefix pentru ION POPESCU-IONESCU' }))
            .toHaveValue('POPESCU-IONESCU')
    })

    it('closes quick title modal on Cancel without saving a quick title', async () => {
        csvHooks.activeEntityType = 'persons'
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.type(screen.getByLabelText(/Func/), 'Reporter')
        await user.click(screen.getByRole('button', { name: /Adaug/i }))
        expect(await screen.findByRole('dialog', { name: /Prefix/ })).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Cancel' }))

        expect(csvHooks.setAllQuickTitles).not.toHaveBeenCalled()
        expect(screen.queryByRole('dialog', { name: /Prefix/ })).not.toBeInTheDocument()
    })

    it('keeps quick title modal open and shows error when quick title save fails', async () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.setAllQuickTitles.mockRejectedValueOnce(new Error('CSV_FAILED'))
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Nume'), 'Ion Popescu')
        await user.type(screen.getByLabelText(/Func/), 'Reporter')
        await user.click(screen.getByRole('button', { name: /Adaug/i }))
        expect(await screen.findByRole('dialog', { name: /Prefix/ })).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Save' }))

        expect(await screen.findByText('CSV_FAILED')).toBeInTheDocument()
        expect(screen.getByRole('dialog', { name: /Prefix/ })).toBeInTheDocument()
    })

    it('keeps quick title modal closed when manual person edit fails', async () => {
        csvHooks.activeEntityType = 'persons'
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
                    occupation: 'Reporter',
                },
            },
        ])
        csvHooks.savePersonEntity.mockResolvedValueOnce({ ok: false, error: 'WRITE_FAILED' })
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const user = userEvent.setup()
        renderEntityEditor()

        await user.clear(screen.getByLabelText(/Func/))
        await user.type(screen.getByLabelText(/Func/), 'Editor')
        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(screen.queryByRole('dialog', { name: /Prefix/ })).not.toBeInTheDocument()
        expect(consoleErrorSpy).toHaveBeenCalledWith('Person save failed:', 'WRITE_FAILED')
    })

    it('keeps quick title modal closed when editing a person in beta', async () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.activeSectionId = 'beta-1'
        csvHooks.activeSection = { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Externe', rows: [] }
        csvHooks.selected = {
            sectionId: 'beta-1',
            entityType: 'persons',
            id: 'person-1',
        }
        csvHooks.getBlockItems.mockReturnValue([
            {
                entityType: 'persons',
                id: 'person-1',
                data: {
                    name: 'ION POPESCU',
                    occupation: 'Reporter',
                },
            },
        ])
        const user = userEvent.setup()
        renderEntityEditor()

        await user.clear(screen.getByLabelText(/Func/))
        await user.type(screen.getByLabelText(/Func/), 'Editor')
        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(screen.queryByRole('dialog', { name: /Prefix/ })).not.toBeInTheDocument()
    })

    it('keeps quick title modal closed when editing a phone call', async () => {
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.selected = {
            sectionId: 'invited-1',
            entityType: 'persons',
            id: 'person-1',
        }
        csvHooks.getBlockItems.mockImplementation((_sectionId, entityType) =>
            entityType === 'phoneCalls'
                ? [
                      {
                          entityType: 'persons',
                          id: 'person-1',
                          data: {
                              name: 'ION POPESCU',
                              occupation: 'Expert',
                              image: 'WORK_PATH/ion_popescu.jpg',
                          },
                      },
                  ]
                : []
        )
        const user = userEvent.setup()
        renderEntityEditor()

        await user.clear(screen.getByLabelText(/Func/))
        await user.type(screen.getByLabelText(/Func/), 'Analyst')
        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(screen.queryByRole('dialog', { name: /Prefix/ })).not.toBeInTheDocument()
        expect(csvHooks.updateEntity).toHaveBeenCalledWith('invited-1', 'persons', 'person-1', {
            name: 'ION POPESCU',
            occupation: 'Analyst',
            image: 'WORK_PATH/ion_popescu.jpg',
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
        csvHooks.getBlockItems.mockImplementation((_sectionId, entityType) =>
            entityType === 'phoneCalls'
                ? [
                      {
                          entityType: 'persons',
                          id: 'person-1',
                          data: {
                              name: 'ION POPESCU',
                              occupation: 'Expert',
                              image: 'WORK_PATH/ion_popescu.jpg',
                          },
                      },
                  ]
                : []
        )
        const user = userEvent.setup()

        renderEntityEditor()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('invited-1', 'phoneCalls')
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

    it('renders title and location inputs for PA hot and wait entity types', () => {
        csvHooks.activeEntityType = 'hotTitles'
        const { rerender } = renderEntityEditor()

        expect(screen.getByLabelText('Titlu')).toBeInTheDocument()

        csvHooks.activeEntityType = 'waitLocations'
        rerender(
            <TestProviders>
                <EntityEditor />
            </TestProviders>
        )

        expect(screen.getByLabelText(/Loca/)).toBeInTheDocument()
    })

    it('uses dedicated templates for hot and wait entity types', () => {
        csvHooks.activeEntityType = 'hotTitles'
        const { container, rerender } = renderEntityEditor()

        expect(container.querySelector('[data-layer-id="hot-title-text"]')).toBeInTheDocument()

        csvHooks.activeEntityType = 'waitTitles'
        rerender(
            <TestProviders>
                <EntityEditor />
            </TestProviders>
        )

        expect(container.querySelector('[data-layer-id="wait-title-text"]')).toBeInTheDocument()

        csvHooks.activeEntityType = 'waitLocations'
        rerender(
            <TestProviders>
                <EntityEditor />
            </TestProviders>
        )

        expect(container.querySelector('[data-layer-id="wait-location-text"]')).toBeInTheDocument()
    })

    it.each([
        ['hotTitles', 'Titlu', 'hotTitles', { title: 'URGENT' }],
        ['waitTitles', 'Titlu', 'waitTitles', { title: 'ASTEPTARE' }],
        ['waitLocations', /Loca/, 'waitLocations', { location: 'CHISINAU' }],
    ] as const)('creates %s in the active section', async (entityType, label, expectedType, payload) => {
        csvHooks.activeEntityType = entityType
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText(label), Object.values(payload)[0])
        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(csvHooks.addEntity).toHaveBeenCalledWith('invited-1', expectedType, payload)
    })

    it('does not allow PLATOU-only entity types in BETA', () => {
        csvHooks.activeEntityType = 'hotTitles'
        csvHooks.activeSectionId = 'beta-1'
        csvHooks.activeSection = { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Externe', rows: [] }

        renderEntityEditor()

        expect(csvHooks.clearSelection).toHaveBeenCalled()
        expect(csvHooks.setActiveEntityType).toHaveBeenCalledWith('titles')
        expect(screen.getByRole('button', { name: /Adaug/i })).toBeDisabled()
    })

    it('does not add entities without an activeSectionId', async () => {
        csvHooks.activeSectionId = null
        const user = userEvent.setup()
        renderEntityEditor()

        await user.type(screen.getByLabelText('Titlu'), 'Breaking')

        expect(screen.getByRole('button', { name: /Adaug/i })).toBeDisabled()
        expect(csvHooks.addEntity).not.toHaveBeenCalled()
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
