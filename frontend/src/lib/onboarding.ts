import type { NavigateFunction } from 'react-router-dom'

import type { Business } from '../types'
import { apiPatch } from './api'
import { pathForStep } from '../onboardingSteps'

export async function advanceOnboarding(
  refreshBusiness: () => Promise<Business | null>,
  navigate: NavigateFunction,
  nextStep: number,
) {
  await apiPatch('/me/business', { onboarding_step: nextStep }, true)
  await refreshBusiness()
  navigate(`/onboarding/${pathForStep(nextStep)}`)
}
