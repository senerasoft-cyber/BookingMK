import { initializePaddle, type Paddle } from '@paddle/paddle-js'

// The backend creates a transaction and hands back its ID; Paddle's checkout
// only actually renders when Paddle.js opens an overlay for that transaction
// client-side -- there is no such thing as a plain hosted checkout URL you
// can just redirect to without Paddle.js present on the landing page.
let paddleInitPromise: Promise<Paddle | undefined> | null = null
let onCheckoutCompleted: (() => void) | null = null

function getPaddle(): Promise<Paddle | undefined> {
  if (paddleInitPromise) return paddleInitPromise

  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined
  if (!token) {
    paddleInitPromise = Promise.resolve(undefined)
    return paddleInitPromise
  }

  paddleInitPromise = initializePaddle({
    token,
    environment: import.meta.env.VITE_PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
    eventCallback: (event) => {
      if (event.name === 'checkout.completed') {
        onCheckoutCompleted?.()
      }
    },
  })
  return paddleInitPromise
}

/** Opens the Paddle overlay checkout for an existing transaction. Returns
 * false if Paddle.js isn't configured (no VITE_PADDLE_CLIENT_TOKEN) so the
 * caller can show an error instead of redirecting somewhere that can't
 * actually render a checkout. */
export async function openPaddleCheckout(transactionId: string, onComplete: () => void): Promise<boolean> {
  const paddle = await getPaddle()
  if (!paddle) return false
  onCheckoutCompleted = onComplete
  paddle.Checkout.open({ transactionId })
  return true
}
