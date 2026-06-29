import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void },
      ) => string
      reset: (widgetId?: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Turnstile'))
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

// Renders nothing (and reports a null token) when no site key is configured,
// so the booking flow works end to end in dev without a real Turnstile site.
export function TurnstileWidget({ onVerify }: { onVerify: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey) return

    let widgetId: string | undefined
    loadTurnstileScript().then(() => {
      if (containerRef.current && window.turnstile) {
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
        })
      }
    })
    return () => {
      if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
    }
  }, [siteKey, onVerify])

  if (!siteKey) return null
  return <div ref={containerRef} className="mt-2" />
}
