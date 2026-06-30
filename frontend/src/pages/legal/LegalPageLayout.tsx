import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '../../components/Logo'
import { ThemeToggle } from '../../components/ThemeToggle'

export function LegalPageLayout({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12 dark:bg-stone-950">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-lg shadow-stone-200/60 dark:bg-stone-900 dark:shadow-none dark:ring-1 dark:ring-stone-800">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-stone-900 dark:text-stone-50">{title}</h1>
        <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">Last updated: {updated}</p>
        <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          {children}
        </div>
      </div>
    </main>
  )
}
