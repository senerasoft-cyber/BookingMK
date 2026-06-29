import type { BookingMode } from '../types'

export const BOOKING_MODES: { value: BookingMode; labelKey: string; descriptionKey: string }[] = [
  {
    value: 'open',
    labelKey: 'onboarding.mode.open',
    descriptionKey: 'onboarding.mode.openDescription',
  },
  {
    value: 'approved_clients',
    labelKey: 'onboarding.mode.approvedClients',
    descriptionKey: 'onboarding.mode.approvedClientsDescription',
  },
  {
    value: 'approve_every',
    labelKey: 'onboarding.mode.approveEvery',
    descriptionKey: 'onboarding.mode.approveEveryDescription',
  },
]
