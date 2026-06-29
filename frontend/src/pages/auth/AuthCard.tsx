import type { ReactNode } from 'react'

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
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg shadow-stone-200">
        <h1 className="font-display text-2xl font-semibold text-stone-900">{title}</h1>
        <p className="mt-1 text-stone-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  )
}
