import { describe, expect, it } from 'vitest'

import { formatDateKey, formatTimeFromIso, nextNDays } from './dates'

describe('nextNDays', () => {
  it('returns the requested number of days starting today', () => {
    const days = nextNDays(14)
    expect(days).toHaveLength(14)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expect(days[0].getTime()).toBe(today.getTime())
  })

  it('produces consecutive calendar days', () => {
    const days = nextNDays(3)
    const oneDayMs = 24 * 60 * 60 * 1000
    expect(days[1].getTime() - days[0].getTime()).toBe(oneDayMs)
    expect(days[2].getTime() - days[1].getTime()).toBe(oneDayMs)
  })
})

describe('formatDateKey', () => {
  it('zero-pads month and day', () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('formats a double-digit month/day correctly', () => {
    expect(formatDateKey(new Date(2026, 11, 25))).toBe('2026-12-25')
  })
})

describe('formatTimeFromIso', () => {
  it('extracts HH:mm from an ISO datetime string', () => {
    expect(formatTimeFromIso('2026-07-06T09:30:00')).toBe('09:30')
  })
})
