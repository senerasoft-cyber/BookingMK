import { Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'

type PlanCopy = {
  id: string
  name: string
  priceMonthly: number
  priceYearly: number
  staffLine: string
  features: string[]
  highlighted?: boolean
}

// Mirrors backend/app/plans.py — kept as static copy here since this page is
// public (no auth) and the prices rarely change.
const PLANS: PlanCopy[] = [
  {
    id: 'basic',
    name: 'Basic',
    priceMonthly: 9,
    priceYearly: 90,
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
    priceMonthly: 19,
    priceYearly: 190,
    staffLine: 'Up to 3 staff members',
    features: ['Everything in Basic', 'Stats dashboard', 'Vouchers & loyalty rewards'],
    highlighted: true,
  },
  {
    id: 'top',
    name: 'Top',
    priceMonthly: 39,
    priceYearly: 390,
    staffLine: 'Unlimited staff',
    features: ['Everything in Mid', 'Remove "Powered by Bukano" branding'],
  },
]

export default function PricingPage() {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const isYearly = interval === 'yearly'

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12 dark:bg-stone-950">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="mt-8 font-display text-3xl font-semibold text-stone-900 dark:text-stone-50">Pricing</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Simple plans billed in EUR. Cancel anytime.
        </p>

        {/* interval toggle */}
        <div className="mt-6 inline-flex items-center gap-1 rounded-xl bg-stone-200 p-1 dark:bg-stone-800">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              !isYearly
                ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-50'
                : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval('yearly')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              isYearly
                ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-50'
                : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            Yearly
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              2 months free
            </span>
          </button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl p-5 shadow-lg shadow-stone-200/60 dark:shadow-none ${
                plan.highlighted
                  ? 'bg-stone-900 text-white ring-2 ring-amber-500 dark:bg-stone-900 dark:ring-amber-500'
                  : 'bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-50 dark:ring-1 dark:ring-stone-800'
              }`}
            >
              {plan.highlighted && (
                <span className="mb-2 inline-flex w-fit items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h2
                className={`font-display text-lg font-semibold ${plan.highlighted ? 'text-white' : 'text-stone-900 dark:text-stone-50'}`}
              >
                {plan.name}
              </h2>

              {isYearly ? (
                <div className="mt-1">
                  <p
                    className={`text-2xl font-semibold ${plan.highlighted ? 'text-white' : 'text-stone-900 dark:text-stone-50'}`}
                  >
                    €{plan.priceYearly}
                    <span
                      className={`text-sm font-normal ${plan.highlighted ? 'text-stone-300' : 'text-stone-500 dark:text-stone-400'}`}
                    >
                      /yr
                    </span>
                  </p>
                  <p
                    className={`text-xs ${plan.highlighted ? 'text-stone-400' : 'text-stone-400 dark:text-stone-500'}`}
                  >
                    €{Math.round(plan.priceYearly / 12)}/mo · saves €{plan.priceMonthly * 2}
                  </p>
                </div>
              ) : (
                <p
                  className={`mt-1 text-2xl font-semibold ${plan.highlighted ? 'text-white' : 'text-stone-900 dark:text-stone-50'}`}
                >
                  €{plan.priceMonthly}
                  <span
                    className={`text-sm font-normal ${plan.highlighted ? 'text-stone-300' : 'text-stone-500 dark:text-stone-400'}`}
                  >
                    /mo
                  </span>
                </p>
              )}

              <p
                className={`mt-2 text-sm ${plan.highlighted ? 'text-stone-300' : 'text-stone-500 dark:text-stone-400'}`}
              >
                {plan.staffLine}
              </p>
              <ul
                className={`mt-3 flex flex-col gap-1.5 text-sm ${plan.highlighted ? 'text-stone-200' : 'text-stone-600 dark:text-stone-300'}`}
              >
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-1.5">
                    <Check
                      size={14}
                      className={plan.highlighted ? 'text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`mt-4 rounded-xl px-4 py-2.5 text-center font-medium transition-colors ${
                  plan.highlighted
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-stone-800 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white'
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center gap-4 text-xs text-stone-400 dark:text-stone-500">
          <Link to="/terms" className="hover:text-stone-600 dark:hover:text-stone-300">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-stone-600 dark:hover:text-stone-300">
            Privacy
          </Link>
          <Link to="/refunds" className="hover:text-stone-600 dark:hover:text-stone-300">
            Refunds
          </Link>
        </div>
      </div>
    </main>
  )
}
