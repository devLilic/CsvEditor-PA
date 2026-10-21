import { useCallback, useEffect, useState } from 'react'
import {
    DEFAULT_LOWER_THIRD_TYPES,
    type LowerThirdTypeDefinition,
} from '@/features/lower-thirds/domain/lowerThirdTypes'
import { lowerThirdTypesService } from '@/features/lower-thirds/services/lowerThirdTypesService'

export function useLowerThirdTypes() {
    const [types, setTypesState] = useState<LowerThirdTypeDefinition[]>(DEFAULT_LOWER_THIRD_TYPES)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        let isMounted = true
        lowerThirdTypesService.get().then((savedTypes) => {
            if (!isMounted) return
            setTypesState(savedTypes)
            setIsLoaded(true)
        }).catch((error) => {
            console.error('Failed to load lower-third types:', error)
            if (isMounted) setIsLoaded(true)
        })

        return () => {
            isMounted = false
        }
    }, [])

    const setTypes = useCallback(async (nextTypes: LowerThirdTypeDefinition[]) => {
        const savedTypes = await lowerThirdTypesService.set(nextTypes)
        setTypesState(savedTypes)
        return savedTypes
    }, [])

    return { types, setTypes, isLoaded }
}
