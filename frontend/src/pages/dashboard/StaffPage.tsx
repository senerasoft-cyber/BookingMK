import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { useAuth } from '../../context/AuthContext'
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '../../lib/api'
import { downscaleImage } from '../../lib/image'
import { planErrorMessage } from '../../lib/planErrors'
import type { Staff } from '../../types'

const STAFF_KEY = ['staff']
const PHOTO_MAX_DIMENSION = 240

export default function StaffPage() {
  const { t } = useTranslation()
  const { business } = useAuth()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [copyFrom, setCopyFrom] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [planError, setPlanError] = useState(false)
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<number | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoTargetRef = useRef<number | null>(null)

  const { data: staff } = useQuery({
    queryKey: STAFF_KEY,
    queryFn: () => apiGet<Staff[]>('/staff', true),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: STAFF_KEY })

  const uploadPhoto = async (staffId: number, file: File) => {
    setUploadingPhotoFor(staffId)
    setError(null)
    try {
      const resized = await downscaleImage(file, PHOTO_MAX_DIMENSION)
      const formData = new FormData()
      formData.append('kind', 'staff_photo')
      formData.append('staff_id', String(staffId))
      formData.append('file', resized)
      await apiUpload('/uploads', formData)
      invalidate()
    } catch (err) {
      setError(planErrorMessage(t, err))
      setPlanError(err instanceof ApiError && err.message === 'plan_branding_not_allowed')
    } finally {
      setUploadingPhotoFor(null)
    }
  }

  const removePhoto = async (member: Staff) => {
    await apiPatch(`/staff/${member.id}`, { photo_url: null }, true)
    invalidate()
  }

  const addStaff = async () => {
    if (!newName.trim()) return
    setError(null)
    setPlanError(false)
    try {
      await apiPost(
        '/staff',
        { name: newName.trim(), ...(copyFrom ? { copy_services_from: copyFrom } : {}) },
        true,
      )
      setNewName('')
      setCopyFrom('')
      invalidate()
    } catch (err) {
      setError(planErrorMessage(t, err))
      setPlanError(err instanceof ApiError && err.message === 'plan_staff_limit_reached')
    }
  }

  const renameStaff = async (member: Staff, name: string) => {
    if (!name.trim() || name === member.name) return
    await apiPatch(`/staff/${member.id}`, { name: name.trim() }, true)
    invalidate()
  }

  const updateBio = async (member: Staff, bio: string) => {
    if (bio === (member.bio ?? '')) return
    await apiPatch(`/staff/${member.id}`, { bio }, true)
    invalidate()
  }

  const toggleActive = async (member: Staff) => {
    await apiPatch(`/staff/${member.id}`, { active: !member.active }, true)
    invalidate()
  }

  const resetPin = async (member: Staff) => {
    await apiPost(`/staff/${member.id}/reset-pin`, undefined, true)
    invalidate()
  }

  const removeStaff = async (member: Staff) => {
    setError(null)
    try {
      await apiDelete(`/staff/${member.id}`, true)
      invalidate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {t('dashboard.staff.title')}
      </h1>
      <p className="mt-1 text-stone-500 dark:text-stone-400">{t('dashboard.staff.subtitle')}</p>
      <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-300">
        {t('dashboard.staff.switcherHint')}
      </p>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          const staffId = photoTargetRef.current
          if (file && staffId !== null) uploadPhoto(staffId, file)
          e.target.value = ''
        }}
      />

      <div className="mt-6 flex flex-col gap-2">
        {staff?.map((member) => (
          <div key={member.id} className="flex flex-col gap-2 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                photoTargetRef.current = member.id
                photoInputRef.current?.click()
              }}
              disabled={uploadingPhotoFor === member.id}
              className="shrink-0"
              aria-label={t('dashboard.staff.uploadPhoto')}
            >
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-400 dark:bg-stone-800 dark:text-stone-500">
                  {uploadingPhotoFor === member.id ? '…' : '+'}
                </span>
              )}
            </button>
            {member.photo_url && (
              <button
                type="button"
                onClick={() => removePhoto(member)}
                className="text-xs font-medium text-stone-400 underline hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
              >
                {t('dashboard.staff.removePhoto')}
              </button>
            )}
            <input
              defaultValue={member.name}
              onBlur={(e) => renameStaff(member, e.target.value)}
              className="flex-1 rounded-lg border border-transparent px-2 py-1 font-medium hover:border-stone-200 focus:border-stone-300 focus:outline-none dark:text-stone-100 dark:hover:border-stone-700 dark:focus:border-stone-600"
            />
            <label className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <input
                type="checkbox"
                checked={member.active}
                onChange={() => toggleActive(member)}
              />
              {t('dashboard.staff.active')}
            </label>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                member.pin_set
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
              }`}
            >
              {member.pin_set ? t('dashboard.staff.pinSet') : t('dashboard.staff.pinNotSet')}
            </span>
            {member.pin_set && (
              <button
                type="button"
                onClick={() => resetPin(member)}
                className="text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              >
                {t('dashboard.staff.resetPin')}
              </button>
            )}
            <button
              type="button"
              onClick={() => removeStaff(member)}
              className="text-stone-400 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400"
              aria-label={t('common.remove')}
            >
              <Trash2 size={18} />
            </button>
          </div>
          <textarea
            defaultValue={member.bio ?? ''}
            onBlur={(e) => updateBio(member, e.target.value)}
            placeholder={t('dashboard.staff.bioPlaceholder')}
            rows={2}
            className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}{' '}
          {planError && (
            <a href="/dashboard/billing" className="underline">
              {t('dashboard.planErrors.upgradeLink')}
            </a>
          )}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-end gap-2">
        <TextInput
          label={t('dashboard.staff.newStaffName')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        {staff && staff.length > 0 && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-stone-700 dark:text-stone-300">
              {t('dashboard.staff.copyServicesFrom')}
            </span>
            <select
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value ? Number(e.target.value) : '')}
              className="rounded-xl border border-stone-200 px-3 py-2.5 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-stone-500 dark:focus:ring-stone-700"
            >
              <option value="">{t('dashboard.staff.copyServicesNone')}</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button type="button" onClick={addStaff} accentKey={business?.accent_key}>
          <span className="flex items-center gap-1">
            <Plus size={16} /> {t('dashboard.staff.addStaff')}
          </span>
        </Button>
      </div>
    </div>
  )
}
