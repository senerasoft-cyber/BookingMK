import { Link } from 'react-router-dom'

import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'

function NavBar() {
  return (
    <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
      <Link to="/">
        <Logo size="lg" />
      </Link>
      <div className="hidden items-center gap-6 sm:flex">
        <Link to="/pricing" className="text-sm text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
          Pricing
        </Link>
        <Link to="/login" className="text-sm text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
          Sign in
        </Link>
        <ThemeToggle />
        <Link
          to="/register"
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
        >
          Get started
        </Link>
      </div>
      <div className="flex items-center gap-3 sm:hidden">
        <ThemeToggle />
        <Link to="/login" className="text-sm text-stone-600 dark:text-stone-400">
          Sign in
        </Link>
        <Link to="/register" className="rounded-xl bg-teal-600 px-3 py-1.5 text-sm font-medium text-white">
          Get started
        </Link>
      </div>
    </nav>
  )
}

function BookingMockup() {
  return (
    <div className="relative mx-auto max-w-xs">
      <div className="w-72 rounded-2xl border border-stone-100 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/40">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600 dark:bg-teal-900/40 dark:text-teal-300">
            H
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">Haircut & Style</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">60 min · with Ana</p>
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">June 2026</p>
        <div className="mb-4 grid grid-cols-7 gap-1 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="py-0.5 text-[10px] font-medium text-stone-400 dark:text-stone-500">
              {d}
            </div>
          ))}
          {[15, 16, 17, 18, 19, 20, 21].map((day, i) => (
            <button
              key={i}
              className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                i === 2
                  ? 'bg-teal-600 text-white'
                  : i === 5 || i === 6
                  ? 'cursor-default text-stone-300 dark:text-stone-600'
                  : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {['9:00', '10:30', '14:00', '15:30'].map((time, i) => (
            <button
              key={i}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                i === 1
                  ? 'border-teal-600 bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:text-stone-400'
              }`}
            >
              {time}
            </button>
          ))}
        </div>

        <button className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
          Confirm booking
        </button>
      </div>

      <div className="absolute -right-3 -top-3 flex items-center gap-2 rounded-xl border border-stone-100 bg-white px-3 py-2 shadow-lg dark:border-stone-700 dark:bg-stone-800">
        <span className="text-sm text-emerald-500">✓</span>
        <span className="text-xs font-semibold text-stone-800 dark:text-stone-100">Booking confirmed!</span>
      </div>

      <div className="absolute -bottom-3 -left-3 flex items-center gap-2 rounded-xl border border-stone-100 bg-white px-3 py-2 shadow-lg dark:border-stone-700 dark:bg-stone-800">
        <span className="text-xs">📧</span>
        <span className="text-xs font-semibold text-stone-800 dark:text-stone-100">Reminder sent</span>
      </div>
    </div>
  )
}

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M3 10h18M8 2v4M16 2v4" />
      </svg>
    ),
    title: '24/7 online bookings',
    body: 'Your clients book anytime from any device — no phone tag, no missed opportunities.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="7" r="3" />
        <path d="M3 21c0-4 2.7-7 6-7M12 21c0-4 2.7-7 6-7" />
      </svg>
    ),
    title: 'Staff scheduling',
    body: 'Assign services to staff, set individual hours, and let clients pick who they want.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    ),
    title: 'Automatic reminders',
    body: 'Email reminders go out automatically before each appointment — fewer no-shows, zero effort.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    title: 'Vouchers & loyalty',
    body: 'Reward your regulars with loyalty perks and issue client vouchers — built right in.',
  },
]

const steps = [
  { num: '01', title: 'Create your account', body: 'Add your services, set your hours, and invite staff — takes about 10 minutes.' },
  { num: '02', title: 'Share your booking link', body: 'Put the link in your Instagram bio, website, or send it to clients directly.' },
  { num: '03', title: 'Bookings come to you', body: 'Clients self-book and get confirmation emails. You manage everything from one dashboard.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-stone-100 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-950/80">
        <NavBar />
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 pb-20 pt-16 lg:flex-row lg:gap-16">
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500"></span>
            Online booking for service businesses
          </div>
          <h1 className="text-4xl font-bold leading-tight text-stone-900 dark:text-stone-50 sm:text-5xl lg:text-6xl">
            Stop losing
            <br />
            clients to
            <br />
            <span className="text-teal-600 dark:text-teal-400">missed calls</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg text-stone-500 dark:text-stone-400 lg:mx-0">
            Bukano gives your business a booking page clients can use 24/7 — with automatic confirmations, email reminders, and a dashboard that keeps you in control.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              to="/register"
              className="rounded-xl bg-teal-600 px-6 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Get started
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl border border-stone-200 px-6 py-3 text-center text-base font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">Plans from €9/month · Set up in minutes</p>
        </div>

        <div className="flex flex-1 justify-center lg:justify-end">
          <BookingMockup />
        </div>
      </section>

      {/* Features */}
      <section className="bg-stone-50 py-20 dark:bg-stone-900/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-50">Everything you need to run bookings</h2>
            <p className="mt-3 text-stone-500 dark:text-stone-400">Built for salons, studios, coaches, and any appointment-based business.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div key={i} className="rounded-2xl border border-stone-100 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                  {f.icon}
                </div>
                <h3 className="mb-2 font-semibold text-stone-900 dark:text-stone-50">{f.title}</h3>
                <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-50">Up and running in minutes</h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center md:items-start md:text-left">
                <span className="text-5xl font-bold text-teal-100 dark:text-teal-900/50">{s.num}</span>
                <h3 className="mb-2 mt-2 font-semibold text-stone-900 dark:text-stone-50">{s.title}</h3>
                <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-teal-700 py-20 dark:bg-teal-800">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">Ready to fill your calendar?</h2>
          <p className="mb-8 text-teal-100">Plans start at €9/month. Set up your booking page in minutes.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="rounded-xl bg-white px-6 py-3 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50"
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-teal-300 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-teal-600"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <Link to="/">
            <Logo inverted />
          </Link>
          <div className="flex flex-wrap justify-center gap-5 text-sm text-stone-400">
            <Link to="/pricing" className="transition-colors hover:text-white">
              Pricing
            </Link>
            <Link to="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link to="/refunds" className="transition-colors hover:text-white">
              Refunds
            </Link>
          </div>
          <p className="text-xs text-stone-600">© 2026 Senera-Soft DOO</p>
        </div>
      </footer>
    </div>
  )
}
