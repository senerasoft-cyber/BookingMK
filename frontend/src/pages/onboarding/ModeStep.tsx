import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/Button'
import { BOOKING_MODES } from '../../constants/bookingOptions'
import { useAuth } from '../../context/AuthContext'
import { apiPatch } from '../../lib/api'
import { advanceOnboarding } from '../../lib/onboarding'
import type { BookingMode } from '../../types'

export default function ModeStep() {
  const { t } = useTranslation()
  const { business, refreshBusiness } = useAuth()
  const navigate = useNavigate()
  const [bookingMode, setBookingMode] = useState<BookingMode>(business?.booking_mode ?? 'open')
  const [requireVerification, setRequireVerification] = useState(
    business?.require_verification ?? false,
  )
  const [collectPhone, setCollectPhone] = useState(business?.collect_phone ?? false)
  const [saving, setSaving] = useState(false)

  const next = async () => {
    setSaving(true)
    try {
      await apiPatch(
        '/me/business',
        {
          booking_mode: bookingMode,
          require_verification: requireVerification,
          collect_phone: collectPhone,
        },
        true,
      )
      await advanceOnboarding(refreshBusiness, navigate, 5)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {t('onboarding.mode.title')}
      </h2>
      <p className="mt-1 text-stone-500 dark:text-stone-400">{t('onboarding.mode.subtitle')}</p>

      <div className="mt-6 flex flex-col gap-2">
        {BOOKING_MODES.map((mode) => (
          <label
            key={mode.value}
            className={`flex cursor-pointer flex-col rounded-xl border p-3 ${
              bookingMode === mode.value
                ? 'border-stone-400 bg-stone-50 dark:border-stone-500 dark:bg-stone-900/40'
                : 'border-stone-200 dark:border-stone-700'
            }`}
          >
            <span className="flex items-center gap-2 font-medium text-stone-800 dark:text-stone-200">
              <input
                type="radio"
                checked={bookingMode === mode.value}
                onChange={() => setBookingMode(mode.value)}
              />
              {t(mode.labelKey)}
            </span>
            <span className="ml-6 text-sm text-stone-500 dark:text-stone-400">{t(mode.descriptionKey)}</span>
          </label>
        ))}
      </div>

      <label className="mt-6 flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
        <input
          type="checkbox"
          checked={requireVerification}
          onChange={(e) => setRequireVerification(e.target.checked)}
        />
        {t('onboarding.mode.requireVerification')}
      </label>
      <p className="ml-6 text-sm text-stone-500 dark:text-stone-400">{t('onboarding.mode.requireVerificationHint')}</p>

      <label className="mt-4 flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
        <input
          type="checkbox"
          checked={collectPhone}
          onChange={(e) => setCollectPhone(e.target.checked)}
        />
        {t('onboarding.mode.collectPhone')}
      </label>
      <p className="ml-6 text-sm text-stone-500 dark:text-stone-400">{t('onboarding.mode.collectPhoneHint')}</p>

      <div className="mt-8 flex justify-end">
        <Button onClick={next} disabled={saving} accentKey={business?.accent_key}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
