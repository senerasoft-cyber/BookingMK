import { Check, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/Button'
import { useAuth } from '../../context/AuthContext'
import { ApiError, apiDelete, apiPatch, apiUpload } from '../../lib/api'
import { downscaleImage } from '../../lib/image'
import { planErrorMessage } from '../../lib/planErrors'
import { ACCENT_KEYS, ACCENTS, getAccent } from '../../theme/accents'
import type { Business } from '../../types'

const LOGO_MAX_DIMENSION = 240
const COVER_MAX_DIMENSION = 1200
const GALLERY_MAX_DIMENSION = 1600
const GALLERY_MAX_IMAGES = 12

export default function BrandingPage() {
  const { t } = useTranslation()
  const { business, refreshBusiness } = useAuth()
  const [accentKey, setAccentKey] = useState(business?.accent_key ?? 'slate')
  const [tagline, setTagline] = useState(business?.tagline ?? '')
  const [saved, setSaved] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planError, setPlanError] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const save = async () => {
    setSaved(false)
    await apiPatch('/me/business', { accent_key: accentKey, tagline }, true)
    await refreshBusiness()
    setSaved(true)
  }

  const upload = async (kind: 'logo' | 'cover' | 'gallery', file: File, maxDimension: number) => {
    const setUploading =
      kind === 'logo' ? setUploadingLogo : kind === 'cover' ? setUploadingCover : setUploadingGallery
    setUploading(true)
    setError(null)
    setPlanError(false)
    try {
      const resized = await downscaleImage(file, maxDimension)
      const formData = new FormData()
      formData.append('kind', kind)
      formData.append('file', resized)
      await apiUpload<Business>('/uploads', formData)
      await refreshBusiness()
    } catch (err) {
      setError(planErrorMessage(t, err))
      setPlanError(err instanceof ApiError && err.message === 'plan_branding_not_allowed')
    } finally {
      setUploading(false)
    }
  }

  const removeGalleryImage = async (url: string) => {
    await apiDelete(`/uploads/gallery?url=${encodeURIComponent(url)}`, true)
    await refreshBusiness()
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-stone-900">
        {t('dashboard.branding.title')}
      </h1>
      <p className="mt-1 text-stone-500">{t('dashboard.branding.subtitle')}</p>
      {error && (
        <p className="mt-3 text-sm text-red-600">
          {error}{' '}
          {planError && (
            <a href="/dashboard/billing" className="underline">
              {t('dashboard.planErrors.upgradeLink')}
            </a>
          )}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-8">
        <div>
          <p className="text-sm font-medium text-stone-700">{t('dashboard.branding.logo')}</p>
          <div className="mt-2 flex items-center gap-3">
            {business?.logo_url && (
              <img
                src={business.logo_url}
                alt={t('dashboard.branding.logo')}
                className="h-16 w-16 rounded-full object-cover"
              />
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload('logo', file, LOGO_MAX_DIMENSION)
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
            >
              {uploadingLogo
                ? t('dashboard.branding.uploading')
                : t('dashboard.branding.uploadLogo')}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">{t('dashboard.branding.cover')}</p>
          <div className="mt-2 flex items-center gap-3">
            {business?.cover_url && (
              <img
                src={business.cover_url}
                alt={t('dashboard.branding.cover')}
                className="h-16 w-28 rounded-lg object-cover"
              />
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload('cover', file, COVER_MAX_DIMENSION)
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploadingCover}
              onClick={() => coverInputRef.current?.click()}
            >
              {uploadingCover
                ? t('dashboard.branding.uploading')
                : t('dashboard.branding.uploadCover')}
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm font-medium text-stone-700">{t('onboarding.branding.accent')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ACCENT_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setAccentKey(key)}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${ACCENTS[key].main}`}
            aria-label={key}
          >
            {accentKey === key && <Check size={16} className="text-white" />}
          </button>
        ))}
      </div>

      <label className="mt-6 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">
          {t('onboarding.branding.tagline')}
        </span>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder={t('onboarding.branding.taglinePlaceholder')}
          className="max-w-md rounded-xl border border-stone-200 px-4 py-2.5 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
        />
      </label>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save} accentKey={accentKey}>
          {t('dashboard.settings.save')}
        </Button>
        {saved && <span className="text-sm text-emerald-600">{t('dashboard.branding.saved')}</span>}
      </div>

      <p className="mt-8 text-sm font-medium text-stone-700">{t('dashboard.branding.gallery')}</p>
      <p className="text-xs text-stone-400">{t('dashboard.branding.galleryHint')}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {(business?.gallery_urls ?? []).map((url) => (
          <div key={url} className="group relative h-20 w-28 overflow-hidden rounded-lg">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeGalleryImage(url)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
              aria-label={t('common.remove')}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {(business?.gallery_urls ?? []).length < GALLERY_MAX_IMAGES && (
          <>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload('gallery', file, GALLERY_MAX_DIMENSION)
              }}
            />
            <button
              type="button"
              disabled={uploadingGallery}
              onClick={() => galleryInputRef.current?.click()}
              className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed border-stone-300 text-xs font-medium text-stone-500 hover:border-stone-400"
            >
              {uploadingGallery
                ? t('dashboard.branding.uploading')
                : t('dashboard.branding.addPhoto')}
            </button>
          </>
        )}
      </div>

      <p className="mt-8 text-sm font-medium text-stone-700">{t('dashboard.branding.preview')}</p>
      <div className="mt-2 max-w-sm overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
        <div
          className={`flex h-28 flex-col items-center justify-end pb-4 ${getAccent(accentKey).main}`}
          style={
            business?.cover_url
              ? {
                  backgroundImage: `url(${business.cover_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        >
          {business?.logo_url && (
            <img
              src={business.logo_url}
              alt={business.name}
              className="h-10 w-10 rounded-full border-2 border-white object-cover shadow"
            />
          )}
        </div>
        <div className={`p-4 text-center ${getAccent(accentKey).canvas}`}>
          <p className="font-display text-base font-semibold text-stone-900">{business?.name}</p>
          {tagline && <p className="mt-1 text-sm text-stone-500">{tagline}</p>}
        </div>
      </div>
    </div>
  )
}
