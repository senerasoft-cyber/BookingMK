import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { ONBOARDING_STEPS } from '../../onboardingSteps'
import { getAccent } from '../../theme/accents'

export default function OnboardingLayout() {
  const { t } = useTranslation()
  const { business } = useAuth()
  const location = useLocation()

  if (!business) return null

  const currentPath = location.pathname.split('/').pop()
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.path === currentPath)
  if (currentIndex === -1 && currentPath !== 'live') {
    return <Navigate to="." replace />
  }

  const accent = getAccent(business.accent_key)

  return (
    <div className={`min-h-screen ${accent.canvas}`}>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <ol className="mb-8 flex flex-wrap gap-2">
          {ONBOARDING_STEPS.map((step, index) => {
            const isDone = index < currentIndex || currentPath === 'live'
            const isCurrent = index === currentIndex
            return (
              <li
                key={step.path}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  isCurrent
                    ? `${accent.main} ${accent.mainText}`
                    : isDone
                      ? `${accent.soft} ${accent.softText}`
                      : 'bg-white text-stone-400 dark:bg-stone-800 dark:text-stone-500'
                }`}
              >
                {index + 1}. {t(step.labelKey)}
              </li>
            )
          })}
        </ol>
        <div className="rounded-2xl bg-white p-8 shadow-lg shadow-stone-200 dark:bg-stone-900 dark:shadow-none dark:ring-1 dark:ring-stone-800">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
