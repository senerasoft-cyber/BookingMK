import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '../../components/Logo'
import { ThemeToggle } from '../../components/ThemeToggle'

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col bg-stone-50 px-6 py-10 dark:bg-stone-950">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-stone-100 bg-white p-8 shadow-lg shadow-stone-200/60 dark:border-stone-800 dark:bg-stone-900 dark:shadow-none">
          <h1 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-50">{title}</h1>
          <p className="mt-1 text-stone-500 dark:text-stone-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
