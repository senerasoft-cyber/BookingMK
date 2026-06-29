export interface OnboardingStepDef {
  step: number
  path: string
  labelKey: string
}

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  { step: 0, path: 'type', labelKey: 'onboarding.steps.type' },
  { step: 1, path: 'services', labelKey: 'onboarding.steps.services' },
  { step: 2, path: 'hours', labelKey: 'onboarding.steps.hours' },
  { step: 3, path: 'branding', labelKey: 'onboarding.steps.branding' },
  { step: 4, path: 'mode', labelKey: 'onboarding.steps.mode' },
  { step: 5, path: 'billing', labelKey: 'onboarding.steps.billing' },
  { step: 6, path: 'live', labelKey: 'onboarding.steps.live' },
]

export function pathForStep(step: number): string {
  const clamped = Math.min(Math.max(step, 0), ONBOARDING_STEPS.length - 1)
  return ONBOARDING_STEPS[clamped].path
}
