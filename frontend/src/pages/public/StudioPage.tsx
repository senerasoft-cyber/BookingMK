import { useQuery } from '@tanstack/react-query'
import { Calendar, Globe, Image as ImageIcon, Info, MapPin, Tag, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import { ThemeToggle } from '../../components/ThemeToggle'
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function LanguageSwitcher() {
  const { i18n } = useTranslation()
  return (
    <select
      value={i18n.language.startsWith('mk') ? 'mk' : 'en'}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
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
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-400 dark:bg-stone-950 dark:text-stone-500">
        …
      </div>
    )
  }
  if (isError || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-500 dark:bg-stone-950 dark:text-stone-400">
        {t('public.notFound')}
      </div>
    )
  }

  const accent = getAccent(business.accent_key)
  const services = needsStaffPicker ? (staffServices ?? []) : business.services
  const hasAbout = !!(business.about_text || business.address || business.contact_phone)
  const hasGallery = business.gallery_urls.length > 0
  const hasSocial = !!(business.instagram_url || business.facebook_url || business.website_url)

  const NAV_ITEMS: { key: View; labelKey: string; icon: typeof Calendar }[] = [
    { key: 'book', labelKey: 'public.nav.book', icon: Calendar },
    { key: 'pricing', labelKey: 'public.nav.pricing', icon: Tag },
    ...(business.staff.length > 0
      ? [{ key: 'staff' as const, labelKey: 'public.nav.staff', icon: Users }]
      : []),
    ...(hasAbout ? [{ key: 'about' as const, labelKey: 'public.nav.about', icon: Info }] : []),
    ...(hasGallery ? [{ key: 'gallery' as const, labelKey: 'public.nav.gallery', icon: ImageIcon }] : []),
  ]

  return (
    <div className={`min-h-screen ${accent.canvas}`}>
      <div className="sticky top-0 z-20 flex items-center justify-end gap-2 border-b border-stone-200/70 bg-white/80 px-4 py-2 backdrop-blur dark:border-stone-800/70 dark:bg-stone-900/80">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <div className="relative h-48 overflow-hidden sm:h-64">
        {business.cover_url ? (
          <img src={business.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className={`relative h-full w-full ${accent.main}`}>
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(white 1.5px, transparent 1.5px)',
                backgroundSize: '22px 22px',
              }}
            />
          </div>
        )}
        <div className={`absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t ${accent.canvasFrom} to-transparent`} />
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        <div className="relative -mt-12 rounded-3xl bg-white px-6 py-7 text-center shadow-xl shadow-stone-200/60 ring-1 ring-stone-100 dark:bg-stone-900 dark:shadow-none dark:ring-stone-800 sm:px-8">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="mx-auto -mt-16 h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-md dark:border-stone-900"
            />
          ) : (
            <div
              className={`mx-auto -mt-16 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white font-display text-xl font-semibold shadow-md dark:border-stone-900 ${accent.soft} ${accent.softText}`}
            >
              {initials(business.name)}
            </div>
          )}

          <h1 className="mt-4 font-display text-2xl font-semibold text-stone-900 dark:text-stone-50">
            {business.name}
          </h1>
          {business.tagline && <p className="mt-1 text-stone-500 dark:text-stone-400">{business.tagline}</p>}

          {(business.address || business.staff.length > 0 || business.services.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {business.address && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${accent.soft} ${accent.softText}`}
                >
                  <MapPin size={13} /> {business.address}
                </span>
              )}
              {business.staff.length > 0 && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${accent.soft} ${accent.softText}`}
                >
                  <Users size={13} />
                  {business.staff.length} {t('public.nav.staff')}
                </span>
              )}
              {business.services.length > 0 && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${accent.soft} ${accent.softText}`}
                >
                  <Tag size={13} />
                  {business.services.length} {t('public.nav.pricing')}
                </span>
              )}
            </div>
          )}

          {hasSocial && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {business.instagram_url && (
                <a
                  href={business.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-200 hover:text-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                >
                  Instagram
                </a>
              )}
              {business.facebook_url && (
                <a
                  href={business.facebook_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-200 hover:text-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                >
                  Facebook
                </a>
              )}
              {business.website_url && (
                <a
                  href={business.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-200 hover:text-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                >
                  <Globe size={13} /> {t('public.website')}
                </a>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  view === item.key
                    ? `${accent.main} ${accent.mainText} shadow-sm`
                    : 'bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-800 dark:hover:bg-stone-800'
                }`}
              >
                <Icon size={15} />
                {t(item.labelKey)}
              </button>
            )
          })}
        </div>

        <div className="relative mt-4 overflow-hidden rounded-3xl bg-white p-6 text-left shadow-lg shadow-stone-200/60 ring-1 ring-stone-100 dark:bg-stone-900 dark:shadow-none dark:ring-stone-800 sm:p-8">
          <div className={`absolute inset-x-0 top-0 h-1.5 ${accent.main}`} />

          {view === 'pricing' && (
            <div>
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">
                {t('public.nav.pricing')}
              </h2>
              {needsStaffPicker && !selectedStaff && (
                <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{t('public.nav.pricingPickStaff')}</p>
              )}
              <ul className="mt-3 flex flex-col gap-2">
                {services.map((svc) => (
                  <li
                    key={svc.id}
                    className="flex items-center justify-between rounded-xl border border-stone-200 p-3 dark:border-stone-700"
                  >
                    <span className="font-medium text-stone-800 dark:text-stone-200">{svc.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold ${accent.soft} ${accent.softText}`}
                    >
                      {svc.price} {business.currency}
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
                          : 'border border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300'
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
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">
                {t('public.nav.staff')}
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {business.staff.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-start gap-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700"
                  >
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${accent.soft} ${accent.softText}`}
                      >
                        {initials(member.name)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-stone-800 dark:text-stone-200">{member.name}</p>
                      {member.bio && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{member.bio}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view === 'about' && (
            <div>
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">
                {t('public.nav.about')}
              </h2>
              {business.about_text && (
                <p className="mt-3 whitespace-pre-line text-sm text-stone-600 dark:text-stone-300">
                  {business.about_text}
                </p>
              )}
              {business.address && (
                <p className="mt-3 flex items-start gap-2 text-sm text-stone-600 dark:text-stone-300">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-stone-400 dark:text-stone-500" />
                  {business.address}
                </p>
              )}
              {business.contact_phone && (
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                  <span className="font-medium text-stone-800 dark:text-stone-200">{t('public.about.contact')}: </span>
                  {business.contact_phone}
                </p>
              )}
            </div>
          )}

          {view === 'gallery' && (
            <div>
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">
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

        {!business.white_label && (
          <p className="mt-6 text-center text-xs text-stone-400 dark:text-stone-500">{t('public.poweredBy')}</p>
        )}
      </div>
    </div>
  )
}
