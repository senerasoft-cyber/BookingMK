import { useQuery } from '@tanstack/react-query'

import { ApiError, apiGet } from '../../lib/api'

interface AdminOverview {
  total_businesses: number
  by_subscription_status: Record<string, number>
  active_by_plan: Record<string, number>
  mrr_eur: number
  recent_businesses: {
    id: number
    name: string
    slug: string
    plan_id: string | null
    subscription_status: string
    created_at: string
  }[]
}

export default function AdminOverviewPage() {
  const { data, isError, error } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => apiGet<AdminOverview>('/admin/overview', true),
    retry: false,
  })

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-500 dark:bg-stone-950 dark:text-stone-400">
        {error instanceof ApiError && error.status === 403
          ? 'Not authorized.'
          : 'Something went wrong.'}
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 dark:bg-stone-950">
      <h1 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">Platform overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-700">
          <p className="text-sm text-stone-500 dark:text-stone-400">Total businesses</p>
          <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{data.total_businesses}</p>
        </div>
        <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-700">
          <p className="text-sm text-stone-500 dark:text-stone-400">Active subscriptions</p>
          <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
            {data.by_subscription_status.active ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-700">
          <p className="text-sm text-stone-500 dark:text-stone-400">MRR</p>
          <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50">€{data.mrr_eur}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-700">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">By subscription status</p>
          <ul className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            {Object.entries(data.by_subscription_status).map(([status, count]) => (
              <li key={status} className="flex justify-between">
                <span>{status}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-700">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Active by plan</p>
          <ul className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            {Object.entries(data.active_by_plan).map(([plan, count]) => (
              <li key={plan} className="flex justify-between">
                <span>{plan}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Most recently registered</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-stone-600 dark:text-stone-300">
          {data.recent_businesses.map((business) => (
            <li key={business.id} className="flex justify-between">
              <span>
                {business.name} (/b/{business.slug})
              </span>
              <span>
                {business.plan_id ?? '—'} · {business.subscription_status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
