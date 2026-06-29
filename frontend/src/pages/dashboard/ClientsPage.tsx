import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { useAuth } from '../../context/AuthContext'
import { ApiError, apiGet, apiPost } from '../../lib/api'
import type { Client } from '../../types'

const CLIENTS_KEY = ['clients']

type FormValues = { name: string; email: string; phone: string }

export default function ClientsPage() {
  const { t } = useTranslation()
  const { business } = useAuth()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const { data: clients } = useQuery({
    queryKey: CLIENTS_KEY,
    queryFn: () => apiGet<Client[]>('/clients', true),
  })

  const query = search.trim().toLowerCase()
  const visibleClients = clients?.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone_e164?.toLowerCase().includes(query),
  )

  const invalidate = () => queryClient.invalidateQueries({ queryKey: CLIENTS_KEY })

  const approve = async (id: number) => {
    await apiPost(`/clients/${id}/approve`, undefined, true)
    invalidate()
  }

  const unapprove = async (id: number) => {
    await apiPost(`/clients/${id}/unapprove`, undefined, true)
    invalidate()
  }

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      await apiPost(
        '/clients',
        { name: values.name, email: values.email || undefined, phone: values.phone || undefined },
        true,
      )
      reset()
      invalidate()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-stone-900">
        {t('dashboard.clients.title')}
      </h1>
      <p className="mt-1 text-stone-500">{t('dashboard.clients.subtitle')}</p>

      <div className="mt-4 max-w-sm">
        <TextInput
          label={t('dashboard.clients.search')}
          placeholder={t('dashboard.clients.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {visibleClients?.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 p-3"
          >
            <div>
              <p className="font-medium text-stone-900">{c.name}</p>
              {c.email && <p className="text-sm text-stone-500">{c.email}</p>}
              {c.phone_e164 && <p className="text-sm text-stone-400">{c.phone_e164}</p>}
              {!c.email && !c.phone_e164 && (
                <p className="text-sm text-stone-400">{t('dashboard.agenda.noContact')}</p>
              )}
              <p className="mt-1 text-xs text-stone-400">
                {t('dashboard.clients.bookingCount', { count: c.booking_count })}
              </p>
            </div>
            {c.is_approved ? (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {t('dashboard.clients.approved')}
                </span>
                <button
                  type="button"
                  onClick={() => unapprove(c.id)}
                  className="text-xs font-medium text-stone-400 underline hover:text-stone-600"
                >
                  {t('dashboard.clients.removeTrusted')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => approve(c.id)}
                className="rounded-lg bg-stone-100 px-3 py-1 text-sm font-medium text-stone-600 hover:bg-stone-200"
              >
                {t('dashboard.clients.approve')}
              </button>
            )}
          </div>
        ))}
        {visibleClients && visibleClients.length === 0 && (
          <p className="text-stone-400">
            {clients && clients.length > 0
              ? t('dashboard.clients.noResults')
              : t('dashboard.clients.empty')}
          </p>
        )}
      </div>

      <h2 className="mt-8 font-medium text-stone-700">{t('dashboard.clients.addClient')}</h2>
      <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label={t('dashboard.clients.name')}
          {...register('name', { required: true })}
          error={errors.name && t('common.required')}
        />
        <TextInput
          label={t('dashboard.clients.email')}
          type="email"
          placeholder="client@example.com"
          {...register('email')}
        />
        <TextInput
          label={t('dashboard.clients.phone')}
          placeholder="+389 70 123 456"
          {...register('phone')}
        />
        <Button type="submit" disabled={isSubmitting} accentKey={business?.accent_key}>
          {t('dashboard.clients.addClientAction')}
        </Button>
      </form>
      {serverError && <p className="mt-2 text-sm text-red-600">{serverError}</p>}
    </div>
  )
}
