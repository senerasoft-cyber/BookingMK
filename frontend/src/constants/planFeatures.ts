import type { Plan } from '../types'

// Baseline features are true on every plan (see backend/app/plans.py docstring),
// so unlike PLAN_FEATURE_KEYS they aren't read off a Plan boolean -- they're
// just always shown, ahead of the per-plan differentiators.
export const BASELINE_PLAN_FEATURE_KEYS: string[] = [
  'onboarding.billing.featureOnlineBooking',
  'onboarding.billing.featureEmailReminders',
  'onboarding.billing.featureBranding',
  'onboarding.billing.featureStaffProfile',
]

export const PLAN_FEATURE_KEYS: { key: keyof Plan; labelKey: string }[] = [
  { key: 'stats', labelKey: 'onboarding.billing.featureStats' },
  { key: 'marketing_tools', labelKey: 'onboarding.billing.featureMarketingTools' },
  { key: 'white_label', labelKey: 'onboarding.billing.featureWhiteLabel' },
]
