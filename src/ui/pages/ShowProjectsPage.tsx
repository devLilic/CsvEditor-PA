import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import {
    cloneShowProject,
    createShowProjectId,
    createStandardShowProject,
    normalizeShowProjectName,
    type ShowProject,
} from '@/features/show-projects/domain/showProject'
import type { LowerThirdEntityKind, LowerThirdTypeDefinition } from '@/features/lower-thirds/domain/lowerThirdTypes'
import { DEFAULT_LOWER_THIRD_TYPE_ID, DEFAULT_LOWER_THIRD_TYPES } from '@/features/lower-thirds/domain/lowerThirdTypes'
import { DEFAULT_ENTITY_TEMPLATE_NAMES, type EntityTemplateNames } from '@/features/lower-thirds/domain/entityTemplateNames'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS, type DefaultProjectSettings } from '@/features/csv-editor/domain/defaultProjectSettings'
import { FALLBACK_PHONE_IMAGE_SETTINGS } from '@/features/csv-editor/domain/phoneImageSettings'
import type { TemplateDocument } from '@/features/template-editor/domain/templateDocument'
import { applyPersonDisplayMode, type PersonDisplayMode } from '@/features/template-editor/domain/personTemplateCompatibility'
import { createTemplateDocumentFromTemplates } from '@/features/template-editor/domain/templateDocument'
import { resolveTemplateDocument } from '@/features/template-editor/domain/templateResolver'
import { broadcastTemplates } from '@/templates/broadcast'
import bundledDefaultTemplateDocument from '@/templates/broadcast/defaultTemplates.pa.json'
import { mergeTedSampleData } from '@/features/template-editor/domain/tedSampleData'
import type { TedEntityType } from '@/features/template-editor/domain/tedTypes'
import { prepareProjectForRuntime, useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'
import { csvFileSettingsService } from '@/features/csv-editor/services/csvFileSettingsService'
import { TemplateLayerAccordion } from '@/ui/components/template-editor/TemplateLayerAccordion'
import { TedSampleDataPanel } from '@/ui/components/template-editor/TedSampleDataPanel'
import { Preview16x9 } from '@/ui/components/preview16x9/Preview16x9'
import './ShowProjectsPage.css'

type MainType = 'titles' | 'persons' | 'locations' | 'phoneCalls' | 'waitTitles' | 'waitLocations'
type LowerKind = LowerThirdEntityKind
type Tab = 'elements' | 'types' | 'details'
type ProjectDraft = ShowProject & {
    lowerThirdTypes: LowerThirdTypeDefinition[]
    entityTemplateNames: EntityTemplateNames
    exportPrefix: string
    defaultProjectSettings: DefaultProjectSettings
    phoneImage: { width: number; height: number }
}
type DraftState = { project: ProjectDraft; workspace: string; isDirty: boolean }
type NextAction = () => void

const elements: Array<{ id: MainType; label: string; sample: string }> = [
    { id: 'titles', label: 'Titluri', sample: 'lower third pentru titluri' },
    { id: 'persons', label: 'Persoane', sample: 'nume, funcție și lower third' },
    { id: 'locations', label: 'Locații', sample: 'element grafic pentru locații' },
    { id: 'phoneCalls', label: 'Apeluri telefonice', sample: 'element grafic pentru apeluri' },
    { id: 'waitTitles', label: 'Wait titles', sample: 'titluri afișate în așteptare' },
    { id: 'waitLocations', label: 'Wait locations', sample: 'locații afișate în așteptare' },
]
const supportedInputFields: Record<MainType | LowerKind, string[]> = {
    titles: ['title', 'supratitle'],
    persons: ['name', 'occupation'],
    locations: ['location'],
    phoneCalls: ['name', 'occupation'],
    waitTitles: ['title'],
    waitLocations: ['location'],
}
const entityNameFields: Array<{ kind: MainType; key: keyof EntityTemplateNames; label: string }> = [
    { kind: 'locations', key: 'locations', label: 'Șablon export locație' },
    { kind: 'phoneCalls', key: 'phones', label: 'Șablon export apel telefonic' },
    { kind: 'waitTitles', key: 'waitTitles', label: 'Șablon export wait title' },
    { kind: 'waitLocations', key: 'waitLocations', label: 'Șablon export wait location' },
]

function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }
function asDraft(project: ShowProject, workspace: string): ProjectDraft {
    const value = copy(project) as ProjectDraft
    value.lowerThirdTypes = value.lowerThirdTypes ?? copy(DEFAULT_LOWER_THIRD_TYPES)
    value.entityTemplateNames = value.entityTemplateNames ?? copy(DEFAULT_ENTITY_TEMPLATE_NAMES)
    value.exportPrefix = value.exportPrefix ?? ''
    value.defaultProjectSettings = value.defaultProjectSettings ?? copy(FALLBACK_DEFAULT_PROJECT_SETTINGS)
    value.phoneImage = value.phoneImage ?? { width: FALLBACK_PHONE_IMAGE_SETTINGS.width, height: FALLBACK_PHONE_IMAGE_SETTINGS.height }
    value.lowerThirdTypesEnabled = value.lowerThirdTypesEnabled !== false
    value.betaSectionButtonEnabled = value.betaSectionButtonEnabled !== false
    value.personDisplayMode = value.personDisplayMode ?? 'single-line'
    value.quickTitleMode = value.quickTitleMode ?? 'supratitle-title'
    return value
}
function isUnique(name: string, projects: ShowProject[], exceptId?: string) {
    const normalized = normalizeShowProjectName(name).toLocaleLowerCase()
    return Boolean(normalized) && projects.every((item) => item.id === exceptId || normalizeShowProjectName(item.name).toLocaleLowerCase() !== normalized)
}
function copyName(name: string, projects: ShowProject[]) {
    const base = `${name} — copie`
    if (isUnique(base, projects)) return base
    let n = 2
    while (!isUnique(`${base} ${n}`, projects)) n += 1
    return `${base} ${n}`
}
function errorText(error?: string) {
    if (error === 'PROJECT_NAME_REQUIRED') return 'Introdu un nume pentru emisiune.'
    if (error === 'PROJECT_NAME_ALREADY_EXISTS') return 'Există deja o emisiune cu acest nume.'
    if (error === 'EDITION_BELONGS_TO_ANOTHER_SHOW') return 'Folderul ales conține o ediție a altei emisiuni. Alege folderul acestei emisiuni sau un folder nou.'
    if (error === 'SHOW_PROJECT_WORKSPACE_ALREADY_ASSIGNED') return 'Folderul ales este deja folosit de altă emisiune. Alege un folder separat.'
    if (error === 'CANNOT_DELETE_LAST_PROJECT') return 'Trebuie să rămână cel puțin o emisiune.'
    return error || 'Operația nu a reușit.'
}
function changeTemplate(document: TemplateDocument, entity: MainType, template: BroadcastTemplate): TemplateDocument {
    return {
        ...document,
        templates: { ...document.templates, [entity]: copy(template) },
        ...(entity === 'titles' || entity === 'persons' ? { lowerThirdVariants: { ...document.lowerThirdVariants, [entity]: { ...document.lowerThirdVariants[entity], ordinary: copy(template) } } } : {}),
    }
}
function changeVariant(document: TemplateDocument, kind: LowerKind, id: string, template: BroadcastTemplate): TemplateDocument {
    return {
        ...document,
        lowerThirdVariants: { ...document.lowerThirdVariants, [kind]: { ...document.lowerThirdVariants[kind], [id]: copy(template) } },
        ...(id === DEFAULT_LOWER_THIRD_TYPE_ID ? { templates: { ...document.templates, [kind]: copy(template) } } : {}),
    }
}

function defaultTemplateDocument(): TemplateDocument {
    const document = resolveTemplateDocument({
        bundledDefaultDocument: bundledDefaultTemplateDocument,
        hardcodedDocument: createTemplateDocumentFromTemplates(broadcastTemplates),
    })
    return document
}

function makeStandardProject(id: string, name: string): ProjectDraft {
    const document = defaultTemplateDocument()
    document.show = id
    return prepareProjectForRuntime(createStandardShowProject(id, name, document))
}

function makeDuplicate(source: ProjectDraft, id: string, name: string): ProjectDraft {
    const project = cloneShowProject(source, id, name) as ProjectDraft
    project.document.show = id
    project.defaultDocument.show = id
    return project
}

export function ShowProjectsPage() {
    const navigate = useNavigate()
    const { projects, activeProjectId, workspaces, isLoaded, projectError, saveProject, deleteProject, importProject, exportProject, registerAdminNavigationGuard } = useTemplateDocument()
    const [selectedId, setSelectedId] = useState('')
    const [draft, setDraft] = useState<DraftState | null>(null)
    const [tab, setTab] = useState<Tab>('elements')
    const [dialog, setDialog] = useState<'new' | 'duplicate' | 'unsaved' | 'delete' | null>(null)
    const [newName, setNewName] = useState('')
    const [nextAction, setNextAction] = useState<NextAction | null>(null)
    const [navigationResolver, setNavigationResolver] = useState<((allowed: boolean) => void) | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const project = projects.find((item) => item.id === selectedId) ?? null
    const workspace = selectedId ? workspaces[selectedId] ?? '' : ''
    const editing = draft?.project.id === selectedId ? draft : null
    const dirty = Boolean(editing && (editing.isDirty || !projects.some((item) => item.id === editing.project.id)))

    useEffect(() => {
        if (!isLoaded || projects.length === 0) return
        setSelectedId((current) => projects.some((item) => item.id === current) ? current : activeProjectId || projects[0].id)
    }, [activeProjectId, isLoaded, projects])
    useEffect(() => {
        if (!selectedId || !project) return
        setDraft((current) => {
            if (current?.project.id === selectedId && current.workspace === workspace) return current
            if (current?.project.id === selectedId && current.isDirty) return current
            const next = asDraft(project, workspace)
            return { project: next, workspace, isDirty: false }
        })
    }, [project, selectedId, workspace])
    useEffect(() => {
        const beforeClose = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
        window.addEventListener('beforeunload', beforeClose)
        return () => window.removeEventListener('beforeunload', beforeClose)
    }, [dirty])
    useEffect(() => registerAdminNavigationGuard(() => {
        if (!dirty) return Promise.resolve(true)
        return new Promise<boolean>((resolve) => {
            setNavigationResolver(() => resolve)
            setNextAction(null)
            setDialog('unsaved')
        })
    }), [dirty, registerAdminNavigationGuard])

    const update = (fn: (value: ProjectDraft) => ProjectDraft) => {
        setDraft((current) => current ? { ...current, project: fn(current.project), isDirty: true } : current)
        setError(''); setNotice('')
    }
    const save = async () => {
        if (!editing) return false
        const name = normalizeShowProjectName(editing.project.name)
        if (!name) { setError(errorText('PROJECT_NAME_REQUIRED')); return false }
        if (!isUnique(name, projects, editing.project.id)) { setError(errorText('PROJECT_NAME_ALREADY_EXISTS')); return false }
        setBusy(true); setError('')
        try {
            const saved = { ...editing.project, name }
            const result = await saveProject(saved, editing.workspace)
            if (!result.ok) { setError(errorText(result.error)); return false }
            const clean = asDraft(saved, editing.workspace)
            setDraft({ project: clean, workspace: editing.workspace, isDirty: false })
            setNotice('Modificările emisiunii au fost salvate.')
            return true
        } catch (reason) { setError(errorText(reason instanceof Error ? reason.message : undefined)); return false }
        finally { setBusy(false) }
    }
    const proceed = (action: NextAction) => {
        if (!dirty) action()
        else { setNextAction(() => action); setDialog('unsaved') }
    }
    const continueAction = () => {
        const action = nextAction
        const resolveNavigation = navigationResolver
        setNextAction(null); setNavigationResolver(null); setDialog(null)
        action?.()
        resolveNavigation?.(true)
    }
    const cancelUnsaved = () => {
        setDialog(null); setNextAction(null)
        const resolveNavigation = navigationResolver
        setNavigationResolver(null)
        resolveNavigation?.(false)
    }
    const discard = () => {
        if (editing) {
            if (project) { const clean = asDraft(project, workspace); setDraft({ project: clean, workspace, isDirty: false }) }
            else setDraft(null)
        }
        continueAction()
    }
    const select = (id: string) => { if (id === selectedId) return; proceed(() => { setSelectedId(id); setTab('elements'); setError(''); setNotice('') }) }
    const openNew = () => { setNewName(isUnique('Emisiune nouă', projects) ? 'Emisiune nouă' : `Emisiune nouă ${projects.length + 1}`); setDialog('new') }
    const createNew = () => {
        const name = normalizeShowProjectName(newName)
        if (!isUnique(name, projects)) { setError(errorText(name ? 'PROJECT_NAME_ALREADY_EXISTS' : 'PROJECT_NAME_REQUIRED')); return }
        proceed(() => {
            const id = createShowProjectId(name, projects.map((item) => item.id))
            const created = makeStandardProject(id, name)
            setSelectedId(id); setDraft({ project: created, workspace: '', isDirty: true }); setTab('elements'); setDialog(null)
            setNotice('Emisiunea nouă este un draft. Salveaz-o pentru a o adăuga în listă.')
        })
    }
    const duplicate = () => {
        if (!editing) return
        proceed(() => {
            setNewName(copyName(editing.project.name, projects))
            setDialog('duplicate')
        })
    }
    const createDuplicate = () => {
        if (!editing) return
        const name = normalizeShowProjectName(newName)
        if (!isUnique(name, projects)) { setError(errorText(name ? 'PROJECT_NAME_ALREADY_EXISTS' : 'PROJECT_NAME_REQUIRED')); return }
        const id = createShowProjectId(name, projects.map((item) => item.id))
        const created = makeDuplicate(editing.project, id, name)
        setSelectedId(id); setDraft({ project: created, workspace: '', isDirty: true }); setTab('elements'); setDialog(null)
        setNotice('Copia completă este un draft independent. Salveaz-o pentru a o adăuga în listă.')
    }
    const doImport = () => proceed(() => { void (async () => {
        setError('')
        const result = await importProject()
        if (!result.ok || !result.project) { if (!result.canceled) setError(errorText(result.error)); return }
        const existing = projects.find((item) => item.id === result.project?.id)
        const name = isUnique(result.project.name, projects, existing?.id)
            ? result.project.name : copyName(result.project.name, projects)
        const id = result.project.id
        const imported = asDraft(prepareProjectForRuntime({ ...result.project, id, name }), '')
        const selectedWorkspace = existing
            ? workspaces[existing.id] ?? ''
            : await csvFileSettingsService.selectProjectFolder()
        const importWorkspace = selectedWorkspace ?? ''
        setSelectedId(imported.id); setDraft({ project: imported, workspace: importWorkspace, isDirty: true }); setTab('elements')
        setNotice(existing
            ? 'Configurația importată este pregătită pentru actualizarea emisiunii existente. Verifică modificările și apasă „Salvează emisiunea”. Folderul local și ediția sunt păstrate.'
            : selectedWorkspace
            ? 'Emisiunea importată este un draft. Salveaz-o pentru a o adăuga în listă.'
            : 'Emisiunea importată este un draft fără folder local. Alege un folder în Datele emisiunii înainte să o folosești.')
    })() })
    const doDelete = async () => {
        setDialog(null)
        const result = await deleteProject(selectedId)
        if (!result.ok) { setError(errorText(result.error)); return }
        const other = projects.find((item) => item.id !== selectedId)
        setDraft(null); setSelectedId(other?.id ?? ''); setNotice('Emisiunea a fost ștearsă.')
    }
    const doExport = async () => {
        if (!editing) return
        const result = await exportProject(editing.project)
        if (!result.ok && !result.canceled) setError(errorText(result.error))
        else if (result.ok && !result.canceled) setNotice('Emisiunea a fost exportată.')
    }
    const chooseFolder = async () => {
        const path = await csvFileSettingsService.selectProjectFolder()
        if (path) setDraft((current) => current ? { ...current, workspace: path, isDirty: true } : current)
    }
    return <main className="show-projects-page app-settings min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
            <header className="show-projects-page-header app-panel sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
                <div><h1 className="text-xl font-semibold text-slate-950">Emisiuni</h1><p className="mt-1 text-sm text-slate-600">Configurează elementele grafice, șabloanele și datele fiecărei emisiuni.</p></div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => proceed(() => navigate('/csv-editor'))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Înapoi la editor</button>
                    <button type="button" onClick={openNew} disabled={!isLoaded} className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Emisiune nouă</button>
                    <button type="button" onClick={duplicate} disabled={!editing} className="rounded-md border px-3 py-2 text-sm">Duplică</button>
                    <button type="button" onClick={() => void doImport()} disabled={!isLoaded || busy} className="rounded-md border px-3 py-2 text-sm">Importă</button>
                    <button type="button" onClick={() => void doExport()} disabled={!editing} className="rounded-md border px-3 py-2 text-sm">Exportă</button>
                    <button type="button" onClick={() => setDialog('delete')} disabled={!project || projects.length < 2} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700">Șterge</button>
                </div>
            </header>
            {(error || projectError) && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorText(error || projectError || undefined)}</p>}
            {notice && <p role="status" className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">{notice}</p>}
            <div className="grid min-h-[calc(100vh-190px)] gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
                <aside className="show-project-list app-panel app-list-panel rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Proiecte de emisiune</h2><div className="flex flex-col gap-1">
                    {editing && !projects.some((item) => item.id === editing.project.id) && <div aria-current="page" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2"><span className="block truncate text-sm font-semibold">{editing.project.name}</span><span className="mt-1 block text-xs font-medium text-amber-800">Draft nou · nesalvat</span></div>}
                    {projects.map((item) => <button type="button" key={item.id} onClick={() => select(item.id)} aria-current={selectedId === item.id ? 'page' : undefined} className={`rounded-md border px-3 py-2 text-left ${selectedId === item.id ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}><span className="block truncate text-sm font-semibold">{item.name}</span><span className="mt-1 flex flex-wrap gap-1 text-xs">{item.id === activeProjectId && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Activă în editor</span>}{item.id === selectedId && dirty && <span className="text-amber-700">Nesalvat</span>}</span></button>)}
                    {!isLoaded && <p className="p-2 text-sm text-slate-500">Se încarcă…</p>}
                </div></aside>
                <section className="show-project-details app-panel min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
                    {!editing ? <div className="p-10 text-center text-sm text-slate-500">Alege o emisiune din listă sau creează una nouă.</div> : <>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div><h2 className="text-lg font-semibold">{editing.project.name} {editing.project.id === activeProjectId && <span className="text-xs text-emerald-700">Activă în editor</span>}</h2><p className="text-xs text-slate-500">Administrarea nu schimbă emisiunea activă din editor.</p></div><button type="button" onClick={() => void save()} disabled={!dirty || busy} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Se salvează…' : 'Salvează emisiunea'}</button></div>
                        <div className="flex flex-wrap gap-1 border-b px-4 pt-3" role="tablist" aria-label="Configurare emisiune">{([['elements','Elemente grafice'],['types','Tipuri lower third'],['details','Datele emisiunii']] as const).map(([id,label]) => <button type="button" key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-t-md border border-b-0 px-4 py-2 text-sm ${tab === id ? 'bg-slate-50 font-semibold text-blue-800' : 'border-transparent text-slate-600'}`}>{label}</button>)}</div>
                        <div className="min-w-0 p-4 md:p-5">{tab === 'elements' && <Elements project={editing.project} onChange={update} />}{tab === 'types' && <LowerThirds project={editing.project} onChange={update} />}{tab === 'details' && <Details project={editing.project} workspace={editing.workspace} onChange={update} onChoose={chooseFolder} />}</div>
                    </>}
                </section>
            </div>
        </div>
        {(dialog === 'new' || dialog === 'duplicate') && <NameDialog title={dialog === 'new' ? 'Emisiune nouă' : 'Duplică emisiunea'} actionLabel={dialog === 'new' ? 'Creează draft' : 'Creează copie'} value={newName} onChange={setNewName} onCancel={() => setDialog(null)} onConfirm={dialog === 'new' ? createNew : createDuplicate} />}
        {dialog === 'unsaved' && <DecisionDialog title="Modificări nesalvate" text="Salvează modificările emisiunii, renunță la ele sau anulează acțiunea." onCancel={cancelUnsaved} onDiscard={discard} onSave={async () => { if (await save()) continueAction() }} busy={busy} />}
        {dialog === 'delete' && <DecisionDialog title="Ștergi emisiunea?" text={`Configurația „${project?.name ?? ''}” va fi eliminată.`} onCancel={() => setDialog(null)} onDiscard={() => void doDelete()} discardLabel="Șterge emisiunea" destructive />}
    </main>
}

function Elements({ project, onChange }: { project: ProjectDraft; onChange: (fn: (project: ProjectDraft) => ProjectDraft) => void }) {
    const [entity, setEntity] = useState<MainType>('titles')
    const [variantId, setVariantId] = useState(DEFAULT_LOWER_THIRD_TYPE_ID)
    const [sample, setSample] = useState<Record<string, string>>({})
    const kind: LowerKind | null = entity === 'titles' || entity === 'persons' ? entity : null
    const variant = project.lowerThirdTypes.find((item) => item.id === variantId) ?? project.lowerThirdTypes[0]
    const template = kind && variant ? project.document.lowerThirdVariants[kind][variant.id] ?? project.document.lowerThirdVariants[kind][DEFAULT_LOWER_THIRD_TYPE_ID] : project.document.templates[entity]
    const enabled = !(project.document.disabledEntityTypes ?? []).includes(entity)
    const setEnabled = (value: boolean) => onChange((current) => ({ ...current, document: { ...current.document, disabledEntityTypes: value ? (current.document.disabledEntityTypes ?? []).filter((type) => type !== entity) : [...new Set([...(current.document.disabledEntityTypes ?? []), entity])] } }))
    const setPersonMode = (mode: PersonDisplayMode) => onChange((current) => ({
        ...current,
        personDisplayMode: mode,
        document: applyPersonDisplayMode(copy(current.document), mode),
        defaultDocument: applyPersonDisplayMode(copy(current.defaultDocument), mode),
    }))
    const setTemplate = (next: BroadcastTemplate) => onChange((current) => ({ ...current, document: kind && variant ? changeVariant(current.document, kind, variant.id, next) : changeTemplate(current.document, entity, next) }))
    const exportField = entityNameFields.find((field) => field.kind === entity)
    return <div>
        <div className="show-element-selector" role="tablist" aria-label="Element grafic">{elements.map((item) => <button type="button" role="tab" key={item.id} aria-selected={entity === item.id} onClick={() => { setEntity(item.id); setSample({}) }} className={`show-element-tab ${entity === item.id ? 'show-element-tab-active' : ''}`}><span>{item.label}</span><small>{(project.document.disabledEntityTypes ?? []).includes(item.id) ? 'Ascuns' : 'Activ'}</small></button>)}</div>
        <div className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 px-4 py-3"><div><h3 className="font-semibold">{elements.find((item) => item.id === entity)?.label}</h3><p className="text-sm text-slate-600">{elements.find((item) => item.id === entity)?.sample}</p></div><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Folosește în editorul principal</label></div>
        {entity === 'titles' && <fieldset className="mb-4 rounded-lg border border-slate-200 bg-white p-4"><legend className="px-1 text-sm font-semibold">Comportament Quick Titles</legend><p className="mb-3 text-xs text-slate-600">Alege cum este introdus prefixul în titlurile acestei emisiuni. Setarea se aplică tuturor variantelor lower third pentru titluri.</p><div className="grid gap-2 md:grid-cols-2"><label className={`cursor-pointer rounded-md border p-3 ${project.quickTitleMode !== 'title-prefix' ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}><span className="flex items-start gap-2"><input type="radio" name={`quick-title-mode-${project.id}`} value="supratitle-title" checked={project.quickTitleMode !== 'title-prefix'} onChange={() => onChange((current) => ({ ...current, quickTitleMode: 'supratitle-title' }))} /><span><strong className="block text-sm">Supratitlu + titlu</strong><small className="mt-1 block text-slate-600">Numele Quick Title apare în supratitlu, iar titlul este introdus între ghilimele.</small></span></span></label><label className={`cursor-pointer rounded-md border p-3 ${project.quickTitleMode === 'title-prefix' ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}><span className="flex items-start gap-2"><input type="radio" name={`quick-title-mode-${project.id}`} value="title-prefix" checked={project.quickTitleMode === 'title-prefix'} onChange={() => onChange((current) => ({ ...current, quickTitleMode: 'title-prefix' }))} /><span><strong className="block text-sm">Doar titlu</strong><small className="mt-1 block text-slate-600">Titlul începe cu „NUME: ”, fără ghilimele. Exemplu: „Breaking: Guvernul anunță măsuri”.</small></span></span></label></div><p className="mt-3 text-xs text-slate-500">Câmpurile de introducere urmează straturile text configurate în șablonul de titlu.</p></fieldset>}
        {entity === 'persons' && <label className="mb-4 flex max-w-md flex-col gap-1 text-sm font-medium">Afișare nume și funcție<select aria-label="Afișare nume și funcție" value={project.personDisplayMode ?? 'single-line'} onChange={(event) => setPersonMode(event.target.value as PersonDisplayMode)} className="rounded-md border px-3 py-2"><option value="single-line">Un singur rând</option><option value="two-lines">Două rânduri</option></select><small className="font-normal text-slate-500">{project.personDisplayMode === 'two-lines' ? 'Numele și funcția apar pe straturi separate.' : 'Numele și funcția sunt unite automat pe același rând.'} Se aplică tuturor variantelor lower third ale emisiunii.</small></label>}
        {kind && project.lowerThirdTypesEnabled && <label className="mb-4 flex max-w-sm flex-col gap-1 text-sm font-medium">Variantă pentru previzualizare<select value={variant?.id ?? DEFAULT_LOWER_THIRD_TYPE_ID} onChange={(event) => setVariantId(event.target.value)} className="rounded-md border px-3 py-2">{project.lowerThirdTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <div className="grid min-w-0 gap-4 2xl:grid-cols-2"><div className="min-w-0"><div className="mb-3 flex justify-between gap-2"><h4 className="font-semibold">Straturi și câmpuri</h4><span className="truncate text-xs text-slate-500">{template.name}</span></div><p className="mb-2 text-xs text-slate-500">Pentru un câmp editabil completează Field id și Entity input label. Câmpuri integrate: {supportedInputFields[entity].join(', ')}; poți adăuga și alte câmpuri personalizate.</p>{kind && variant && variant.id !== DEFAULT_LOWER_THIRD_TYPE_ID && <p className="mb-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-900">Culorile textului și fundalului sunt preluate din paleta „{variant.name}” din Tipuri lower third.</p>}<div className="max-h-[65vh] overflow-y-auto pr-1"><TemplateLayerAccordion template={template} onTemplateChange={setTemplate} supportedInputFields={supportedInputFields[entity]} showLayerColorFields={!kind || !variant || variant.id === DEFAULT_LOWER_THIRD_TYPE_ID} /></div></div><div className="min-w-0"><h4 className="mb-3 font-semibold">Previzualizare</h4><div className="show-template-preview overflow-hidden rounded-lg border border-slate-200"><Preview16x9 template={template} sampleData={mergeTedSampleData(entity as TedEntityType, sample)} fitMode="width" maxHeight={560} templateVariant={kind && variant && variant.id !== DEFAULT_LOWER_THIRD_TYPE_ID ? variant.name : undefined} lowerThirdPalette={kind && variant && variant.id !== DEFAULT_LOWER_THIRD_TYPE_ID ? variant.palette : undefined} /></div><div className="mt-3 max-h-[30vh] overflow-y-auto"><TedSampleDataPanel entityType={entity as TedEntityType} overrides={sample} onOverridesChange={setSample} /></div></div></div>
        {exportField && <section className="mt-5 rounded-lg border p-4"><h4 className="font-semibold">Nume la export</h4><label className="mt-3 flex max-w-xl flex-col gap-1 text-sm font-medium">{exportField.label}<span className="flex rounded border bg-slate-50"><span className="border-r px-3 py-2 font-mono text-xs text-slate-500">{project.exportPrefix || 'fără prefix'}</span><input value={project.entityTemplateNames[exportField.key]} onChange={(event) => onChange((current) => ({ ...current, entityTemplateNames: { ...current.entityTemplateNames, [exportField.key]: event.target.value } }))} className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm" /></span><small className="font-normal text-slate-500">Export: {project.exportPrefix}{project.entityTemplateNames[exportField.key]}</small></label></section>}
    </div>
}

function LowerThirds({ project, onChange }: { project: ProjectDraft; onChange: (fn: (project: ProjectDraft) => ProjectDraft) => void }) {
    const [id, setId] = useState(DEFAULT_LOWER_THIRD_TYPE_ID)
    const [kind, setKind] = useState<LowerKind>('titles')
    const [sample, setSample] = useState<Record<string, string>>({})
    const selected = project.lowerThirdTypes.find((item) => item.id === id) ?? project.lowerThirdTypes[0]
    const template = selected ? project.document.lowerThirdVariants[kind][selected.id] ?? project.document.lowerThirdVariants[kind][DEFAULT_LOWER_THIRD_TYPE_ID] : null
    const updateType = (key: string, fn: (type: LowerThirdTypeDefinition) => LowerThirdTypeDefinition) => onChange((current) => ({ ...current, lowerThirdTypes: current.lowerThirdTypes.map((item) => item.id === key ? fn(item) : item) }))
    const add = () => {
        const base = project.lowerThirdTypes.find((item) => item.id === DEFAULT_LOWER_THIRD_TYPE_ID)
        if (!base) return
        const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
        const newId = `custom-${randomId}`
        const type = { ...copy(base), id: newId, name: 'Tip nou', templates: { titles: { name: `Titlu_${newId}` }, persons: { name: `Persoana_${newId}` } } }
        onChange((current) => ({ ...current, lowerThirdTypes: [...current.lowerThirdTypes, type], document: { ...current.document, lowerThirdVariants: { titles: { ...current.document.lowerThirdVariants.titles, [newId]: copy(current.document.lowerThirdVariants.titles[DEFAULT_LOWER_THIRD_TYPE_ID]) }, persons: { ...current.document.lowerThirdVariants.persons, [newId]: copy(current.document.lowerThirdVariants.persons[DEFAULT_LOWER_THIRD_TYPE_ID]) } } } }))
        setId(newId)
    }
    const remove = (removeId: string) => {
        if (removeId === DEFAULT_LOWER_THIRD_TYPE_ID) return
        onChange((current) => {
            const titles = { ...current.document.lowerThirdVariants.titles }, persons = { ...current.document.lowerThirdVariants.persons }
            delete titles[removeId]; delete persons[removeId]
            return { ...current, lowerThirdTypes: current.lowerThirdTypes.filter((item) => item.id !== removeId), document: { ...current.document, lowerThirdVariants: { ...current.document.lowerThirdVariants, titles, persons } } }
        })
        if (id === removeId) setId(DEFAULT_LOWER_THIRD_TYPE_ID)
    }
    const setTemplate = (next: BroadcastTemplate) => { if (selected) onChange((current) => ({ ...current, document: changeVariant(current.document, kind, selected.id, next) })) }
    return <div className="grid gap-4 2xl:grid-cols-[300px_minmax(0,1fr)]"><aside className="rounded-lg border p-3"><div className="mb-3 flex items-start justify-between gap-2"><div><h3 className="font-semibold">Tipuri lower third</h3><p className="text-xs text-slate-500">Configurate separat pentru emisiune</p></div><button type="button" onClick={add} className="rounded border px-3 py-1.5 text-sm">Adaugă</button></div><label className="mb-3 flex items-center gap-2 rounded bg-slate-50 p-2 text-sm"><input type="checkbox" checked={project.lowerThirdTypesEnabled !== false} onChange={(event) => onChange((current) => ({ ...current, lowerThirdTypesEnabled: event.target.checked }))} />Folosește variante în editor</label><div className="flex flex-col gap-1">{project.lowerThirdTypes.map((item) => <button type="button" key={item.id} aria-pressed={item.id === id} onClick={() => setId(item.id)} className={`flex items-center gap-2 rounded border px-3 py-2 text-left ${item.id === id ? 'border-blue-300 bg-blue-50' : 'hover:bg-slate-50'}`}><i className="h-3 w-3 rounded-full" style={{ background: item.palette.indicatorColor }} /><span className="truncate text-sm font-medium">{item.name}</span>{item.id === DEFAULT_LOWER_THIRD_TYPE_ID && <small className="ml-auto">Implicit</small>}</button>)}</div></aside>
        {selected ? <section className="min-w-0 rounded-lg border p-4"><div className="mb-4 flex flex-wrap items-center gap-3"><label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-medium">Denumire<input value={selected.name} onChange={(event) => updateType(selected.id, (type) => ({ ...type, name: event.target.value }))} className="rounded border px-3 py-2" /></label>{selected.id !== DEFAULT_LOWER_THIRD_TYPE_ID && <button type="button" onClick={() => remove(selected.id)} className="rounded border border-red-200 px-3 py-2 text-sm text-red-700">Șterge tipul</button>}</div>
            {selected.id === DEFAULT_LOWER_THIRD_TYPE_ID ? (
                <p className="mb-4 rounded bg-blue-50 px-3 py-2 text-xs text-blue-900">Varianta implicită folosește culorile șablonului din Elemente grafice.</p>
            ) : (
                <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([['indicatorColor','Culoare indicator'],['backgroundColor','Fundal'],['textColor','Text']] as const).map(([key,label]) => <label key={key} className="flex flex-col gap-1 text-sm font-medium">{label}<span className="flex items-center gap-2 rounded border px-2 py-1"><input type="color" value={selected.palette[key]} onChange={(event) => updateType(selected.id, (type) => ({ ...type, palette: { ...type.palette, [key]: event.target.value } }))} /><small className="font-mono">{selected.palette[key]}</small></span></label>)}<label className="flex flex-col gap-1 text-sm font-medium">Opacitate<span className="flex items-center gap-2"><input type="range" min="0" max="1" step="0.05" value={selected.palette.opacity} onChange={(event) => updateType(selected.id, (type) => ({ ...type, palette: { ...type.palette, opacity: Number(event.target.value) } }))} /><small>{Math.round(selected.palette.opacity * 100)}%</small></span></label></div>
            )}
            <div className="mb-4 grid gap-3 md:grid-cols-2">{(['titles','persons'] as const).map((entry) => <label key={entry} className="flex flex-col gap-1 text-sm font-medium">Nume export pentru {entry === 'titles' ? 'titlu' : 'persoană'}<span className="flex rounded border bg-slate-50"><span className="border-r px-2 py-2 font-mono text-xs">{project.exportPrefix || 'fără prefix'}</span><input value={selected.templates[entry].name} onChange={(event) => updateType(selected.id, (type) => ({ ...type, templates: { ...type.templates, [entry]: { name: event.target.value } } }))} className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm" /></span><small className="font-normal">Export: {project.exportPrefix}{selected.templates[entry].name}</small></label>)}</div>
            <div className="mb-3 flex gap-2">{(['titles','persons'] as const).map((entry) => <button type="button" key={entry} onClick={() => { setKind(entry); setSample({}) }} className={`rounded border px-3 py-2 text-sm ${entry === kind ? 'bg-blue-700 text-white' : ''}`}>Șablon {entry === 'titles' ? 'titlu' : 'persoană'}</button>)}</div>
            <div className="grid min-w-0 gap-4 2xl:grid-cols-2"><div><p className="mb-2 text-xs text-slate-500">{selected.id === DEFAULT_LOWER_THIRD_TYPE_ID ? 'Culorile variantei de bază se editează în șablonul din Elemente grafice. ' : 'Culorile textului și fundalului se setează în paleta tipului lower third. '}Câmpuri integrate: {supportedInputFields[kind].join(', ')}; completează Entity input label pentru a afișa un câmp în editor.</p><div className="max-h-[65vh] overflow-y-auto pr-1">{template && <TemplateLayerAccordion template={template} onTemplateChange={setTemplate} supportedInputFields={supportedInputFields[kind]} showLayerColorFields={selected.id === DEFAULT_LOWER_THIRD_TYPE_ID} />}</div></div><div className="min-w-0"><div className="show-template-preview overflow-hidden rounded-lg border border-slate-200">{template && <Preview16x9 template={template} sampleData={mergeTedSampleData(kind, sample)} fitMode="width" maxHeight={500} templateVariant={selected.id === DEFAULT_LOWER_THIRD_TYPE_ID ? undefined : selected.name} lowerThirdPalette={selected.id === DEFAULT_LOWER_THIRD_TYPE_ID ? undefined : selected.palette} />}</div><div className="mt-3 max-h-[30vh] overflow-y-auto"><TedSampleDataPanel entityType={kind} overrides={sample} onOverridesChange={setSample} /></div></div></div>
        </section> : <p className="rounded-lg border p-8 text-sm text-slate-500">Adaugă un tip lower third pentru a începe.</p>}</div>
}

function Details({ project, workspace, onChange, onChoose }: { project: ProjectDraft; workspace: string; onChange: (fn: (project: ProjectDraft) => ProjectDraft) => void; onChoose: () => void }) {
    const field = (key: keyof DefaultProjectSettings, label: string) => <label key={key} className="flex flex-col gap-1 text-sm font-medium">{label}<input value={project.defaultProjectSettings[key]} onChange={(event) => onChange((current) => ({ ...current, defaultProjectSettings: { ...current.defaultProjectSettings, [key]: event.target.value } }))} className="rounded border px-3 py-2 font-normal" /></label>
    return <div className="grid gap-4 xl:grid-cols-2"><section className="rounded-lg border p-4"><h3 className="mb-4 font-semibold">Date emisiune</h3><label className="flex flex-col gap-1 text-sm font-medium">Nume<input value={project.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} className="rounded border px-3 py-2" /></label><label className="mt-4 flex flex-col gap-1 text-sm font-medium">Folder local<span className="flex gap-2"><input readOnly value={workspace} placeholder="Fără folder local" className="min-w-0 flex-1 rounded border bg-slate-50 px-3 py-2 font-normal" /><button type="button" onClick={onChoose} className="rounded border px-3 py-2 text-sm">Alege…</button></span></label><p className="mt-1 text-xs text-slate-500">Opțional; emisiunea rămâne portabilă fără folder local.</p><label className="mt-4 flex flex-col gap-1 text-sm font-medium">Prefix la export<input value={project.exportPrefix} onChange={(event) => onChange((current) => ({ ...current, exportPrefix: event.target.value }))} placeholder="Ex. PA_" className="rounded border px-3 py-2 font-mono" /></label><label className="mt-5 flex items-center gap-2 border-t pt-4 text-sm font-medium"><input type="checkbox" checked={project.betaSectionButtonEnabled !== false} onChange={(event) => onChange((current) => ({ ...current, betaSectionButtonEnabled: event.target.checked }))} />Afișează butonul „Adaugă BETA” pentru această emisiune</label><p className="mt-1 text-xs text-slate-500">Această opțiune este salvată odată cu emisiunea și se aplică doar proiectului curent.</p></section><section className="rounded-lg border p-4"><h3 className="mb-4 font-semibold">Valori implicite</h3><div className="grid gap-3 sm:grid-cols-2">{field('title','Titlu')}{field('personName','Nume persoană')}{field('personOccupation','Funcție')}{field('location','Locație')}</div><div className="mt-5 border-t pt-4"><h4 className="mb-3 text-sm font-semibold">Dimensiune imagine apel telefonic</h4><div className="grid gap-3 sm:grid-cols-2">{(['width','height'] as const).map((key) => <label key={key} className="flex flex-col gap-1 text-sm font-medium">{key === 'width' ? 'Lățime' : 'Înălțime'} (px)<input type="number" min="1" value={project.phoneImage[key]} onChange={(event) => onChange((current) => ({ ...current, phoneImage: { ...current.phoneImage, [key]: Math.max(1, Number(event.target.value) || 1) } }))} className="rounded border px-3 py-2" /></label>)}</div></div></section></div>
}

function NameDialog({ title, actionLabel, value, onChange, onCancel, onConfirm }: { title: string; actionLabel: string; value: string; onChange: (value: string) => void; onCancel: () => void; onConfirm: () => void }) { return <div className="app-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" className="app-modal w-full max-w-md rounded-lg bg-white p-5 shadow-xl"><h2 className="text-lg font-semibold">{title}</h2><label className="mt-4 flex flex-col gap-1 text-sm font-medium">Nume<input autoFocus value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onConfirm() }} className="rounded border px-3 py-2" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded border px-3 py-2 text-sm">Anulează</button><button type="button" onClick={onConfirm} className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white">{actionLabel}</button></div></section></div> }
function DecisionDialog({ title, text, onCancel, onDiscard, onSave, busy = false, discardLabel = 'Renunță la modificări', destructive = false }: { title: string; text: string; onCancel: () => void; onDiscard: () => void; onSave?: () => void; busy?: boolean; discardLabel?: string; destructive?: boolean }) { return <div className="app-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" className="app-modal w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-600">{text}</p><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onCancel} className="rounded border px-3 py-2 text-sm">Anulează</button><button type="button" onClick={onDiscard} disabled={busy} className={`rounded border px-3 py-2 text-sm ${destructive ? 'border-red-200 text-red-700' : ''}`}>{discardLabel}</button>{onSave && <button type="button" onClick={onSave} disabled={busy} className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white">{busy ? 'Se salvează…' : 'Salvează'}</button>}</div></section></div> }
