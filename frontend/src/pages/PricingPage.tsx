import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

type PlanCopy = {
  id: string
  name: string
  priceEur: number
  staffLine: string
  features: string[]
}

// Mirrors backend/app/plans.py — kept as static copy here since this page is
// public (no auth) and the prices rarely change.
const PLANS: PlanCopy[] = [
  {
    id: 'basic',
    name: 'Basic',
    priceEur: 9,
    staffLine: 'Up to 1 staff member',
    features: [
      'Online booking page',
      'Email verification & reminders',
      'Branding (logo, cover, gallery)',
      'Staff profile & bio',
    ],
  },
  {
    id: 'mid',
    name: 'Mid',
    priceEur: 19,
    staffLine: 'Up to 3 staff members',
    features: ['Everything in Basic', 'Stats dashboard', 'Vouchers & loyalty rewards'],
  },
  {
    id: 'top',
    name: 'Top',
    priceEur: 39,
    staffLine: 'Unlimited staff',
    features: ['Everything in Mid', 'Remove "Powered by Bukano" branding'],
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm font-medium text-stone-500 underline">
          ← Bukano
        </Link>
        <h1 className="mt-4 font-display text-2xl font-semibold text-stone-900">Pricing</h1>
        <p className="mt-1 text-sm text-stone-500">
          Every plan is a paid subscription billed monthly in EUR — there's no free tier. Cancel
          anytime.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col rounded-2xl bg-white p-5 shadow-lg shadow-stone-200"
            >
              <h2 className="font-display text-lg font-semibold text-stone-900">{plan.name}</h2>
              <p className="mt-1 text-2xl font-semibold text-stone-900">
                €{plan.priceEur}
                <span className="text-sm font-normal text-stone-500">/mo</span>
              </p>
              <p className="mt-2 text-sm text-stone-500">{plan.staffLine}</p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-stone-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-600" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="mt-4 rounded-xl bg-stone-800 px-4 py-2.5 text-center font-medium text-white"
              >
                Get started
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center gap-4 text-xs text-stone-400">
          <Link to="/terms" className="hover:text-stone-600">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-stone-600">
            Privacy
          </Link>
          <Link to="/refunds" className="hover:text-stone-600">
            Refunds
          </Link>
        </div>
      </div>
    </main>
  )
}
