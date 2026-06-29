import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

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
    <main className="min-h-screen bg-stone-50 px-6 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-lg shadow-stone-200">
        <Link to="/" className="text-sm font-medium text-stone-500 underline">
          ← Bukano
        </Link>
        <h1 className="mt-4 font-display text-2xl font-semibold text-stone-900">{title}</h1>
        <p className="mt-1 text-sm text-stone-400">Last updated: {updated}</p>
        <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-stone-700">
          {children}
        </div>
      </div>
    </main>
  )
}
