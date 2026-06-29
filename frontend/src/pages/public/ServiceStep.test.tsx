import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import type { PublicService } from '../../types'
import ServiceStep from './ServiceStep'

beforeAll(async () => {
  const i18n = (await import('../../i18n')).default
  await i18n.changeLanguage('en')
})

const SERVICES: PublicService[] = [
  { id: 1, name: "Men's haircut", duration_minutes: 30, price: 400 },
  { id: 2, name: 'Shave', duration_minutes: 20, price: 250 },
]

describe('ServiceStep', () => {
  it('renders every service with its price and duration', () => {
    render(<ServiceStep services={SERVICES} accentKey="amber" currency="MKD" onSelect={vi.fn()} />)
    expect(screen.getByText("Men's haircut")).toBeInTheDocument()
    expect(screen.getByText('Shave')).toBeInTheDocument()
    expect(screen.getByText('400 MKD')).toBeInTheDocument()
    expect(screen.getByText('20 min')).toBeInTheDocument()
  })

  it('calls onSelect with the clicked service', async () => {
    const onSelect = vi.fn()
    render(<ServiceStep services={SERVICES} accentKey="amber" currency="MKD" onSelect={onSelect} />)

    await userEvent.click(screen.getByText('Shave'))

    expect(onSelect).toHaveBeenCalledWith(SERVICES[1])
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when there are no services', () => {
    render(<ServiceStep services={[]} accentKey="amber" currency="MKD" onSelect={vi.fn()} />)
    expect(screen.getByText("This business hasn't added any services yet.")).toBeInTheDocument()
  })
})
