import { Navigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { pathForStep } from '../../onboardingSteps'

export default function OnboardingGate() {
  const { business } = useAuth()
  if (!business) return null

  if (business.onboarding_completed_at) {
    return <Navigate to="/dashboard" replace />
  }
  return <Navigate to={pathForStep(business.onboarding_step)} replace />
}
