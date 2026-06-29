import { LegalPageLayout } from './LegalPageLayout'

const SUPPORT_EMAIL = 'support@bukano.net'
const OPERATOR = 'Senera-Soft DOO (Delčevo, North Macedonia), trading as Maceda'

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" updated="2026-06-29">
      <p>
        This Privacy Policy explains what information Bukano ("we", "us"), operated by {OPERATOR},
        collects, why, and how it's handled.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900">1. What we collect</h2>
      <p>
        <strong>From business owners:</strong> email address, password (stored as an irreversible
        hash, never in plain text), business name and settings, and payment-related identifiers from
        our payment processor (Paddle) — we never see or store your card details ourselves.
      </p>
      <p>
        <strong>From end clients booking an appointment:</strong> name and phone number, supplied by
        the client to the business they're booking with, used only to manage that booking and send
        related messages (confirmations, reminders, verification codes).
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900">2. How we use it</h2>
      <p>
        To operate the booking platform: creating accounts, managing appointments, sending
        booking-related SMS/WhatsApp/Viber messages, processing subscription payments, and providing
        support. We don't sell personal data, and we don't use it for advertising.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900">3. Who we share it with</h2>
      <p>
        We share data only with the service providers needed to run the platform: our messaging
        provider (Twilio, for SMS/WhatsApp delivery) and our payment processor (Paddle, for billing
        business owners). These providers process data on our behalf under their own data protection
        terms — we don't share data with anyone else, and never sell it.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900">4. Data retention</h2>
      <p>
        We keep account and appointment data for as long as the account is active, plus a reasonable
        period afterward for legal/accounting purposes. You can request deletion of your business
        account and associated data at any time (see Contact below).
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900">5. Cookies and tracking</h2>
      <p>
        Bukano uses browser local storage to keep you signed in — no third-party advertising or
        analytics cookies are set.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900">6. Your rights</h2>
      <p>
        Depending on where you're located, you may have the right to access, correct, export, or
        delete the personal data we hold about you. Contact us to exercise any of these rights.
      </p>

      <h2 className="font-display text-lg font-semibold text-stone-900">7. Contact</h2>
      <p>
        Questions about this policy or your data? Email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPageLayout>
  )
}
