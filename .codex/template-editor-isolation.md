# TemplateEditor isolation notes

Files checked:

- `src/App.tsx`
- `src/ui/pages/TemplateEditorPage.tsx`
- `src/features/template-editor/*`
- `src/ui/template-editor/*`

Route and entry point:

- `/template-editor` is registered in `src/App.tsx`.
- `App.tsx` imports `TemplateEditorPage` and mounts it only for the `/template-editor` route.
- `/` redirects to `/csv-editor`.
- `/csv-editor` mounts `CsvEditorPage`.

Current `TemplateEditorPage` usage:

- `TemplateEditorPage` is referenced only by `src/App.tsx`.
- It creates an inline `initialTemplate`.
- It wraps editor UI in `TemplateEditorProvider`.
- It renders `TemplateEditorLayout` plus `BackgroundPanel`.

TemplateEditor feature code:

- `src/features/template-editor/domain/template.types.ts` defines `Template`, `Background`, and current layer types.
- `src/features/template-editor/hooks/useTemplateEditor.ts` owns mutable editor operations: add, delete, move, resize, reorder, background changes, save JSON.
- `src/features/template-editor/context/TemplateEditorContext.tsx` provides that editor state/API to editor UI.
- `src/features/template-editor/state/*` contains reducer/action types for editor behavior.
- `src/features/template-editor/index.ts` exports the template types and editor context.

TemplateEditor UI code:

- `TemplateEditorLayout` composes `LayersPanel`, `TemplateEditorToolbar`, `TemplateCanvasWrapper`, and `InspectorPanel`.
- `TemplateCanvasWrapper` scales the old editor canvas to fit its container.
- `TemplateCanvas` renders editable Konva layers from editor state.
- `TextNode`, `RectangleNode`, and `KonvaImageNode` are editor/render helper nodes.
- `TemplateEditorToolbar`, `LayersPanel`, `InspectorPanel`, `BackgroundPanel`, `BackgroundEditor`, and `BackgroundControls` are all editor UI.

What can remain temporarily unused:

- The entire `/template-editor` route can remain present but should not be developed further for this cycle.
- `TemplateEditorPage`, `TemplateEditorProvider`, `useTemplateEditor`, reducer/state files, and `src/ui/template-editor/*` can remain in the repo without affecting CSV editor as long as `/csv-editor` does not import them.
- CSV editor currently depends on `src/ui/components/Preview16x9.tsx` and `src/ui/components/preview-graphics/*`, not on the TemplateEditor page/layout.
- Template domain types may still be useful as a starting point for static templates, but editor-specific operations and UI should be avoided in next tasks.

Direction lock:

- Do not delete code in this task.
- Do not implement or improve TemplateEditor.
- Future template work should be static-template support in code, not app-side editing UI.
