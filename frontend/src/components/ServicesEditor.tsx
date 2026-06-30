import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'
import type { Service } from '../types'

export function ServicesEditor({ staffId }: { staffId?: number } = {}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const servicesKey = ['services', staffId ?? 'default']
  const servicesPath = staffId ? `/services?staff_id=${staffId}` : '/services'

  const { data: services } = useQuery({
    queryKey: servicesKey,
    queryFn: () => apiGet<Service[]>(servicesPath, true),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: servicesKey })

  const updateField = async (service: Service, field: keyof Service, value: string) => {
    const parsed = field === 'duration_minutes' || field === 'price' ? Number(value) : value
    await apiPatch(`/services/${service.id}`, { [field]: parsed }, true)
    invalidate()
  }

  const addService = async () => {
    await apiPost(
      '/services',
      {
        name: t('onboarding.services.newServiceName'),
        duration_minutes: 30,
        price: 0,
        ...(staffId ? { staff_id: staffId } : {}),
      },
      true,
    )
    invalidate()
  }

  const removeService = async (id: number) => {
    await apiDelete(`/services/${id}`, true)
    invalidate()
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {services?.map((service) => (
          <div
            key={service.id}
            className="flex items-end gap-2 rounded-xl border border-stone-200 p-3 dark:border-stone-700"
          >
            <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-stone-500 dark:text-stone-400">
              {t('onboarding.services.name')}
              <input
                defaultValue={service.name}
                onBlur={(e) => updateField(service, 'name', e.target.value)}
                className="rounded-lg border border-stone-200 px-2 py-1 text-sm font-normal text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-stone-500"
              />
            </label>
            <label className="flex w-24 flex-col gap-1 text-xs font-medium text-stone-500 dark:text-stone-400">
              {t('onboarding.services.duration')}
              <input
                type="number"
                defaultValue={service.duration_minutes}
                onBlur={(e) => updateField(service, 'duration_minutes', e.target.value)}
                className="rounded-lg border border-stone-200 px-2 py-1 text-right text-sm font-normal text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-stone-500"
              />
            </label>
            <label className="flex w-28 flex-col gap-1 text-xs font-medium text-stone-500 dark:text-stone-400">
              {t('onboarding.services.price')}
              <input
                type="number"
                defaultValue={service.price}
                onBlur={(e) => updateField(service, 'price', e.target.value)}
                className="rounded-lg border border-stone-200 px-2 py-1 text-right text-sm font-normal text-stone-900 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-stone-500"
              />
            </label>
            <button
              type="button"
              onClick={() => removeService(service.id)}
              className="text-stone-400 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400"
              aria-label={t('common.remove')}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addService}
        className="mt-3 flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50"
      >
        <Plus size={16} /> {t('onboarding.services.addService')}
      </button>
    </div>
  )
}
