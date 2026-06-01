import { useCallback } from 'react'
import { useCsvContext } from '../context/CsvContext'
import type { EntityType } from '../domain/entities'

/**
 * ON AIR logic
 * - max 1 per EntityType
 * - independent de selecție
 */
export function useOnAir() {
    const { state, dispatch } = useCsvContext()

    const setOnAir = useCallback(
        (type: EntityType, id: string) => {
            dispatch({
                type: 'SET_ON_AIR',
                payload: { type, id },
            })
        },
        [dispatch]
    )

    const clearOnAir = useCallback(
        (type: EntityType) => {
            dispatch({
                type: 'CLEAR_ON_AIR',
                payload: { type },
            })
        },
        [dispatch]
    )

    const isOnAir = useCallback(
        (type: EntityType, id: string) =>
            state.onAir[type] === id,
        [state.onAir]
    )

    return {
        onAirMap: state.onAir,
        setOnAir,
        clearOnAir,
        isOnAir,
    }
}
