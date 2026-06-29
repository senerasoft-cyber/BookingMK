import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import { apiGet } from '../../lib/api'
import { getAccent } from '../../theme/accents'
import type { BookingResult, PublicBusiness, PublicService, PublicStaff } from '../../types'
import DateTimeStep from './DateTimeStep'
import DetailsStep from './DetailsStep'
import ResultStep from './ResultStep'
import ServiceStep from './ServiceStep'
import StaffStep from './StaffStep'
import VerifyStep from './VerifyStep'

type Step = 'service' | 'datetime' | 'details' | 'verify' | 'result'
type View = 'book' | 'pricing' | 'staff' | 'about' | 'gallery'

type PendingVerification = {
  name: string
  email: string
  devCode?: string
}

function LanguageSwitcher() {
  const { i18n } = useTranslation()
  return (
    <select
      value={i18n.language.startsWith('mk') ? 'mk' : 'en'}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600"
    >
      <option value="en">EN</option>
      <option value="mk">МК</option>
    </select>
  )
}

export default function StudioPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useTranslation()
  const [view, setView] = useState<View>('book')
  const [step, setStep] = useState<Step>('service')
  const [selectedStaff, setSelectedStaff] = useState<PublicStaff | null>(null)
  const [service, setService] = useState<PublicService | null>(null)
  const [startsAt, setStartsAt] = useState<string | null>(null)
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null)
  const [result, setResult] = useState<BookingResult | null>(null)

  const {
    data: business,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['public-business', slug],
    queryFn: () => apiGet<PublicBusiness>(`/b/${slug}`),
  })

  const needsStaffPicker = (business?.staff.length ?? 0) > 1
  const { data: staffServices } = useQuery({
    queryKey: ['public-staff-services', slug, selectedStaff?.id],
    queryFn: () => apiGet<PublicService[]>(`/b/${slug}/staff/${selectedStaff!.id}/services`),
    enabled: needsStaffPicker && !!selectedStaff,
  })

  if (isPending) {
    return <div className="flex min-h-screen items-center justify-center text-stone-400">…</div>
  }
  if (isError || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-500">
        {t('public.notFound')}
      </div>
    )
  }

  const accent = getAccent(business.accent_key)
  const services = needsStaffPicker ? (staffServices ?? []) : business.services
  const hasAbout = !!(business.about_text || business.address || business.contact_phone)
  const hasGallery = business.gallery_urls.length > 0
  const hasSocial = !!(business.instagram_url || business.facebook_url || business.website_url)

  const NAV_ITEMS: { key: View; labelKey: string }[] = [
    { key: 'book', labelKey: 'public.nav.book' },
    { key: 'pricing', labelKey: 'public.nav.pricing' },
    ...(business.staff.length > 0 ? [{ key: 'staff' as const, labelKey: 'public.nav.staff' }] : []),
    ...(hasAbout ? [{ key: 'about' as const, labelKey: 'public.nav.about' }] : []),
    ...(hasGallery ? [{ key: 'gallery' as const, labelKey: 'public.nav.gallery' }] : []),
  ]

  return (
    <div className={`min-h-screen ${accent.canvas}`}>
      <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-white px-4 py-2 shadow-sm">
        <span />
        <div className="flex flex-wrap justify-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                view === item.key ? `${accent.soft} ${accent.softText}` : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
        <div className="justify-self-end">
          <LanguageSwitcher />
        </div>
      </nav>

      <div
        className={`h-40 ${accent.main}`}
        style={
          business.cover_url
            ? {
                backgroundImage: `url(${business.cover_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      />

      <div className="mx-auto max-w-xl px-6 pb-16 pt-4 text-center">
        {business.logo_url && (
          <img
            src={business.logo_url}
            alt={business.name}
            className="mx-auto h-16 w-16 rounded-full border-4 border-white object-cover shadow-md"
          />
        )}
        <h1 className="mt-3 font-display text-2xl font-semibold text-stone-900">
          {business.name}
        </h1>
        {business.tagline && <p className="mt-1 text-stone-500">{business.tagline}</p>}

        <div className="mt-6 rounded-2xl bg-white p-6 text-left shadow-lg shadow-stone-200">
          {view === 'pricing' && (
            <div>
              <h2 className="font-display text-lg font-semibold text-stone-900">
                {t('public.nav.pricing')}
              </h2>
              {needsStaffPicker && !selectedStaff && (
                <p className="mt-3 text-sm text-stone-500">{t('public.nav.pricingPickStaff')}</p>
              )}
              <ul className="mt-3 flex flex-col gap-2">
                {services.map((svc) => (
                  <li
                    key={svc.id}
                    className="flex items-center justify-between rounded-xl border border-stone-200 p-3"
                  >
                    <span className="font-medium text-stone-800">{svc.name}</span>
                    <span className="text-sm text-stone-500">
                      {svc.duration_minutes} {t('public.service.minutes')} · {svc.price}{' '}
                      {business.currency}
                    </span>
                  </li>
                ))}
              </ul>
              {needsStaffPicker && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {business.staff.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedStaff(member)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        selectedStaff?.id === member.id
                          ? `${accent.soft} ${accent.softText}`
                          : 'border border-stone-200 text-stone-600'
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'staff' && (
            <div>
              <h2 className="font-display text-lg font-semibold text-stone-900">
                {t('public.nav.staff')}
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {business.staff.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-start gap-3 rounded-xl border border-stone-200 p-3"
                  >
                    {member.photo_url && (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium text-stone-800">{member.name}</p>
                      {member.bio && <p className="mt-1 text-sm text-stone-500">{member.bio}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view === 'about' && (
            <div>
              <h2 className="font-display text-lg font-semibold text-stone-900">
                {t('public.nav.about')}
              </h2>
              {business.about_text && (
                <p className="mt-3 whitespace-pre-line text-sm text-stone-600">
                  {business.about_text}
                </p>
              )}
              {business.address && (
                <p className="mt-3 text-sm text-stone-600">
                  <span className="font-medium text-stone-800">{t('public.about.address')}: </span>
                  {business.address}
                </p>
              )}
              {business.contact_phone && (
                <p className="mt-1 text-sm text-stone-600">
                  <span className="font-medium text-stone-800">{t('public.about.contact')}: </span>
                  {business.contact_phone}
                </p>
              )}
            </div>
          )}

          {view === 'gallery' && (
            <div>
              <h2 className="font-display text-lg font-semibold text-stone-900">
                {t('public.nav.gallery')}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {business.gallery_urls.map((url) => (
                  <img key={url} src={url} alt="" className="h-32 w-full rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}

          {view === 'book' && (
            <>
              {step === 'service' && needsStaffPicker && !selectedStaff && (
                <StaffStep
                  staff={business.staff}
                  accentKey={business.accent_key}
                  onSelect={(staff) => setSelectedStaff(staff)}
                />
              )}
              {step === 'service' && (!needsStaffPicker || selectedStaff) && (
                <ServiceStep
                  services={services}
                  accentKey={business.accent_key}
                  currency={business.currency}
                  onSelect={(selected) => {
                    setService(selected)
                    setStep('datetime')
                  }}
                />
              )}
              {step === 'datetime' && service && (
                <DateTimeStep
                  slug={business.slug}
                  service={service}
                  accentKey={business.accent_key}
                  onBack={() => setStep('service')}
                  onSelectSlot={(iso) => {
                    setStartsAt(iso)
                    setStep('details')
                  }}
                />
              )}
              {step === 'details' && service && startsAt && (
                <DetailsStep
                  slug={business.slug}
                  service={service}
                  startsAt={startsAt}
                  accentKey={business.accent_key}
                  requireVerification={business.require_verification}
                  collectPhone={business.collect_phone}
                  onBack={() => setStep('datetime')}
                  onBooked={(bookingResult) => {
                    setResult(bookingResult)
                    setStep('result')
                  }}
                  onVerificationStarted={(info) => {
                    setPendingVerification(info)
                    setStep('verify')
                  }}
                />
              )}
              {step === 'verify' && service && startsAt && pendingVerification && (
                <VerifyStep
                  slug={business.slug}
                  service={service}
                  startsAt={startsAt}
                  name={pendingVerification.name}
                  email={pendingVerification.email}
                  devCode={pendingVerification.devCode}
                  accentKey={business.accent_key}
                  onBack={() => setStep('details')}
                  onBooked={(bookingResult) => {
                    setResult(bookingResult)
                    setStep('result')
                  }}
                />
              )}
              {step === 'result' && result && (
                <ResultStep
                  result={result}
                  accentKey={business.accent_key}
                  onBookAnother={() => {
                    setSelectedStaff(null)
                    setService(null)
                    setStartsAt(null)
                    setPendingVerification(null)
                    setResult(null)
                    setStep('service')
                  }}
                />
              )}
            </>
          )}
        </div>

        {hasSocial && (
          <div className="mt-6 flex justify-center gap-4 text-sm">
            {business.instagram_url && (
              <a
                href={business.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-stone-400 hover:text-stone-600"
              >
                Instagram
              </a>
            )}
            {business.facebook_url && (
              <a
                href={business.facebook_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-stone-400 hover:text-stone-600"
              >
                Facebook
              </a>
            )}
            {business.website_url && (
              <a
                href={business.website_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-stone-400 hover:text-stone-600"
              >
                {t('public.website')}
              </a>
            )}
          </div>
        )}

        {!business.white_label && (
          <p className="mt-8 text-xs text-stone-400">{t('public.poweredBy')}</p>
        )}
      </div>
    </div>
  )
}
