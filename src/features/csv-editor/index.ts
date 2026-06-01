// src/features/csv-editor/index.ts

// services
export { csvService } from './services/csvService'
export { settingsService } from './services/settingsService'

// hooks
export { useCsvInitialization } from './hooks/useCsvInitialization'
export { useCsvAutosave } from './hooks/useCsvAutosave'
export { useEntities } from './hooks/useEntities'
export { useSelectedEntity } from './hooks/useSelectedEntity'
export { useQuickTitles } from './hooks/useQuickTitles'
export { useActiveEntityType } from './hooks/useActiveEntityType'
export { useOnAir } from './hooks/useOnAir'
export { phoneImageSettingsService } from './services/phoneImageSettingsService'
export { phoneImageService } from './services/phoneImageService'

// context
export { CsvProvider } from './context/CsvContext'

// domain
export * from './domain/entities'
export * from './domain/csv.types'
export * from './domain/csv.schema'
export * from './domain/supportedEntityTypes'
export * from './domain/editorViewTypes'
export * from './domain/phoneCall'
export * from './domain/phoneImageSettings'
export * from './domain/phoneImageFile'
export * from './domain/phoneImagePath'
export * from './domain/imageCropMath'
export type {
    FrameSize,
    ImageSize,
    ImageTransform,
    RenderedImageRect,
    SourceCropRect,
} from './domain/phoneImageCropMath'
export {
    calculateInitialCoverTransform,
    calculateRenderedImageRect,
    calculateSourceCropRect,
    clampImageTransformToFrame,
    getAspectRatio as getPhoneImageFrameAspectRatio,
} from './domain/phoneImageCropMath'
