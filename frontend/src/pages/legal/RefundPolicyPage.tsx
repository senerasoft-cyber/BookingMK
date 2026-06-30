import { LegalPageLayout } from './LegalPageLayout'

const SUPPORT_EMAIL = 'support@bukano.net'

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout title="Refund Policy" updated="2026-06-29">
      <p>
        Subscriptions are billed monthly in advance. This policy explains when a refund applies.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">
        Cancelling your subscription
      </h2>
      <p>
        You can cancel anytime from your dashboard. Cancelling stops future renewals, but we don't
        prorate or refund the time remaining in your current billing period — you keep full access
        until it ends.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">When we do refund</h2>
      <p>We'll issue a full or partial refund if:</p>
      <ul className="list-disc pl-5">
        <li>you were charged twice for the same billing period by mistake,</li>
        <li>a technical fault on our side meant you couldn't use the service you paid for, or</li>
        <li>you were charged after a cancellation that should have taken effect first.</li>
      </ul>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">How to request one</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your account email and
        the charge you're asking about. Payments are processed by Paddle.com Market Limited, our
        merchant of record — Paddle may also handle your request directly under their own
        buyer-facing terms, and disputes/chargebacks are ultimately subject to Paddle's policies.
      </p>
    </LegalPageLayout>
  )
}
