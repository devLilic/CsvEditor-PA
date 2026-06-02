import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TedEntityTabs } from './TedEntityTabs'

afterEach(() => {
    cleanup()
})

describe('TedEntityTabs', () => {
    it('marks the active tab as selected', () => {
        render(<TedEntityTabs activeEntityType="persons" onChange={vi.fn()} />)

        expect(screen.getByRole('tab', { name: 'Persons' })).toHaveAttribute(
            'aria-selected',
            'true',
        )
        expect(screen.getByRole('tab', { name: 'Titles' })).toHaveAttribute(
            'aria-selected',
            'false',
        )
    })

    it('changes entity type when each tab is clicked', async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(<TedEntityTabs activeEntityType="titles" onChange={onChange} />)

        await user.click(screen.getByRole('tab', { name: 'Persons' }))
        await user.click(screen.getByRole('tab', { name: 'Locations' }))
        await user.click(screen.getByRole('tab', { name: 'Phones' }))
        await user.click(screen.getByRole('tab', { name: 'Hot Titles' }))
        await user.click(screen.getByRole('tab', { name: 'Wait Titles' }))
        await user.click(screen.getByRole('tab', { name: 'Wait Locations' }))
        await user.click(screen.getByRole('tab', { name: 'Titles' }))

        expect(onChange).toHaveBeenNthCalledWith(1, 'persons')
        expect(onChange).toHaveBeenNthCalledWith(2, 'locations')
        expect(onChange).toHaveBeenNthCalledWith(3, 'phoneCalls')
        expect(onChange).toHaveBeenNthCalledWith(4, 'hotTitles')
        expect(onChange).toHaveBeenNthCalledWith(5, 'waitTitles')
        expect(onChange).toHaveBeenNthCalledWith(6, 'waitLocations')
        expect(onChange).toHaveBeenNthCalledWith(7, 'titles')
    })
})
