import { describe, expect, it } from 'vitest'

import { minutesToTimeInput, timeInputToMinutes } from './time'

describe('minutesToTimeInput', () => {
  it('formats midnight', () => {
    expect(minutesToTimeInput(0)).toBe('00:00')
  })

  it('formats a typical opening time', () => {
    expect(minutesToTimeInput(540)).toBe('09:00')
  })

  it('pads single-digit hours and minutes', () => {
    expect(minutesToTimeInput(65)).toBe('01:05')
  })
})

describe('timeInputToMinutes', () => {
  it('parses midnight', () => {
    expect(timeInputToMinutes('00:00')).toBe(0)
  })

  it('parses a typical opening time', () => {
    expect(timeInputToMinutes('09:00')).toBe(540)
  })

  it('round-trips with minutesToTimeInput', () => {
    expect(timeInputToMinutes(minutesToTimeInput(725))).toBe(725)
  })
})
