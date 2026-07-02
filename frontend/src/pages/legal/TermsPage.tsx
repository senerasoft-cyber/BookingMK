import { LegalPageLayout } from './LegalPageLayout'

const SUPPORT_EMAIL = 'support@bukano.net'
const OPERATOR = 'Senera-Soft DOO (Delčevo, North Macedonia), trading as Maceda'

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" updated="2026-06-29">
      <p>
        These Terms of Service ("Terms") govern access to and use of Bukano ("Bukano", "we", "us"),
        an online appointment-booking and business-management platform operated by {OPERATOR}. By
        creating an account you agree to these Terms.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">1. The service</h2>
      <p>
        Bukano lets a business ("Owner") set up a public booking page, manage staff, services,
        working hours, and appointments, and send booking-related email messages (confirmations,
        reminders, verification codes) to their own clients. End clients book appointments through
        an Owner's public page free of charge — only the Owner is billed.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">2. Accounts</h2>
      <p>
        You're responsible for keeping your account credentials and any staff PINs confidential, and
        for everything that happens under your account. You must provide accurate information when
        registering and keep your business details up to date.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">
        3. Subscriptions and billing
      </h2>
      <p>
        Access requires an active paid subscription on one of our published plans, billed monthly in
        advance in EUR. Payments are processed by Paddle.com Market Limited, our payment processor
        and merchant of record — Paddle handles your payment details and is the merchant for tax and
        payment-processing purposes. Subscriptions renew automatically each month until cancelled.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">4. Cancellation</h2>
      <p>
        You can cancel anytime from your dashboard. Cancellation takes effect at the end of your
        current paid billing period — you keep access until then, and you won't be charged again
        after that. See our Refund Policy for exceptions.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">5. Acceptable use</h2>
      <p>
        Don't use Bukano to send unsolicited messages, harass anyone, or otherwise abuse the
        booking or notification features. We may suspend accounts that abuse the platform or attempt
        to circumvent its rate limits or subscription tiers.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">6. Your clients' data</h2>
      <p>
        As an Owner, you're responsible for having a lawful basis to collect and message your own
        clients' information (name, phone number, appointment history) through the platform, and for
        complying with any applicable consumer-protection or marketing-communication laws in your
        market.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">7. Service availability</h2>
      <p>
        We aim to keep Bukano available and reliable but don't guarantee uninterrupted access.
        We're not liable for losses arising from downtime, third-party messaging-provider failures,
        or issues outside our reasonable control.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">8. Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of Bukano after a change takes
        effect means you accept the updated Terms.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">9. Contact</h2>
      <p>
        Questions about these Terms? Email us at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPageLayout>
  )
}
