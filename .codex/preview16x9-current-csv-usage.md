# Preview16x9 current CSV usage

Files checked:

- `src/ui/components/Preview16x9.tsx`
- `src/ui/components/EntityEditor.tsx`
- `src/ui/components/preview-graphics/*`
- `src/features/csv-editor/hooks/useScaleToFit.ts`
- `src/features/csv-editor/hooks/usePreviewLayout.ts`

Current `Preview16x9` props:

- `content: ReactNode`
- `entityType: EntityType`
- `measureText: string`

How `EntityEditor` builds preview data:

- Reads `activeEntityType` from CSV editor state.
- Builds `previewContent` from the current unsaved form.
- For `persons`, `previewContent` is an array: `[name, occupation]`.
- For all other entity types, `previewContent` is a single uppercase string from `title` or `location`.
- Builds `previewMeasureText` as a plain string used only for text fitting.
- Calls `Preview16x9` as:
  - `entityType={activeEntityType}`
  - `content={previewContent}`
  - `measureText={previewMeasureText}`

How `GRAPHICS_MAP` works:

- `Preview16x9` maps `entityType` to an old graphics component.
- Known mappings:
  - `titles` -> `TitleGraphics`
  - `persons` -> `PersonGraphics`
  - `locations` -> `LocationGraphics`
  - `hotTitles` -> `HotTitleGraphics`
  - `waitTitles` -> `WaitTitleGraphics`
  - `waitLocations` -> `WaitLocationGraphics`
- Unknown entity types fall back to `FallbackGraphics`.
- The selected graphics component receives:
  - `content`
  - `containerRef`
  - `textRef`
  - `scaleX`
  - `isLayoutReady`

Current scaling/layout behavior:

- `usePreviewLayout` measures the preview root and the specific title/text container.
- `useScaleToFit` measures text width and returns a horizontal `scaleX`.
- The old graphics components apply `transform: scaleX(...)` to text spans.
- This means the current implementation scales text horizontally per graphic, not the full virtual canvas.
- The current approach is legacy behavior and does not match the new Preview16x9 rule.

Temporary compatibility decision:

- Keep the old preview-graphics components temporarily so CSV editor does not break during migration.
- Keep `GRAPHICS_MAP` temporarily while `EntityEditor` still calls `Preview16x9` with `entityType`, `content`, and `measureText`.
- Keep `useScaleToFit` and `usePreviewLayout` temporarily only for the legacy CSV preview path.
- Remove or bypass them gradually after `Preview16x9` receives a `template` and renders layers from that template.

New target contract:

- New `Preview16x9` must receive a `template`.
- It should not depend on `entityType`, `content`, or `measureText`.
- It should render template `background`, `text`, `image`, and `shape` layers in virtual 16:9 coordinates.
- It should scale the whole canvas uniformly, not each layer separately.
