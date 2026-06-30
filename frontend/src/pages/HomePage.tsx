import { Link } from 'react-router-dom'

function BukanoLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#f97316" />
      <rect x="10" y="11" width="14" height="3" rx="1.5" fill="white" />
      <rect x="10" y="17" width="20" height="3" rx="1.5" fill="white" />
      <rect x="10" y="23" width="16" height="3" rx="1.5" fill="white" opacity="0.7" />
    </svg>
  )
}

function NavBar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
      <Link to="/" className="flex items-center gap-2.5">
        <BukanoLogo size={36} />
        <span className="text-xl font-semibold text-stone-900" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
          Bukano
        </span>
      </Link>
      <div className="hidden sm:flex items-center gap-6">
        <Link to="/pricing" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
          Pricing
        </Link>
        <Link to="/login" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
          Sign in
        </Link>
        <Link
          to="/register"
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          Get started
        </Link>
      </div>
      <div className="flex sm:hidden items-center gap-3">
        <Link to="/login" className="text-sm text-stone-600">Sign in</Link>
        <Link to="/register" className="rounded-xl bg-orange-500 px-3 py-1.5 text-sm font-medium text-white">
          Get started
        </Link>
      </div>
    </nav>
  )
}

function BookingMockup() {
  return (
    <div className="relative mx-auto max-w-xs">
      <div className="rounded-2xl bg-white shadow-2xl border border-stone-100 p-5 w-72">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
            H
          </div>
          <div>
            <p className="font-semibold text-stone-900 text-sm">Haircut & Style</p>
            <p className="text-xs text-stone-400">60 min · with Ana</p>
          </div>
        </div>

        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">June 2026</p>
        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] text-stone-400 font-medium py-0.5">{d}</div>
          ))}
          {[15, 16, 17, 18, 19, 20, 21].map((day, i) => (
            <button
              key={i}
              className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                i === 2
                  ? 'bg-orange-500 text-white'
                  : i === 5 || i === 6
                  ? 'text-stone-300 cursor-default'
                  : 'hover:bg-stone-100 text-stone-700'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {['9:00', '10:30', '14:00', '15:30'].map((t, i) => (
            <button
              key={i}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                i === 1
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button className="w-full bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-orange-600 transition-colors">
          Confirm booking
        </button>
      </div>

      <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-lg border border-stone-100 px-3 py-2 flex items-center gap-2">
        <span className="text-emerald-500 text-sm">✓</span>
        <span className="text-stone-800 text-xs font-semibold">Booking confirmed!</span>
      </div>

      <div className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg border border-stone-100 px-3 py-2 flex items-center gap-2">
        <span className="text-xs">📧</span>
        <span className="text-stone-800 text-xs font-semibold">Reminder sent</span>
      </div>
    </div>
  )
}

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M3 10h18M8 2v4M16 2v4" />
      </svg>
    ),
    title: '24/7 online bookings',
    body: 'Your clients book anytime from any device — no phone tag, no missed opportunities.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path d="M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    ),
    title: 'Automatic reminders',
    body: 'Email reminders go out automatically before each appointment — fewer no-shows, zero effort.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
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
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-stone-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <NavBar />
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 text-xs font-medium text-orange-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"></span>
            Online booking for service businesses
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 leading-tight" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
            Stop losing<br />clients to<br />
            <span className="text-orange-500">missed calls</span>
          </h1>
          <p className="mt-5 text-lg text-stone-500 max-w-lg mx-auto lg:mx-0">
            Bukano gives your business a booking page clients can use 24/7 — with automatic confirmations, email reminders, and a dashboard that keeps you in control.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Link
              to="/register"
              className="rounded-xl bg-orange-500 px-6 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors text-center"
            >
              Get started
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl border border-stone-200 px-6 py-3 text-base font-medium text-stone-700 hover:bg-stone-50 transition-colors text-center"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-xs text-stone-400">Plans from €9/month · Set up in minutes</p>
        </div>

        <div className="flex-1 flex justify-center lg:justify-end">
          <BookingMockup />
        </div>
      </section>

      {/* Features */}
      <section className="bg-stone-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
              Everything you need to run bookings
            </h2>
            <p className="mt-3 text-stone-500">Built for salons, studios, coaches, and any appointment-based business.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-stone-100">
                <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-stone-900 mb-2">{f.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
              Up and running in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center md:items-start md:text-left">
                <span className="text-5xl font-bold text-orange-100" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>{s.num}</span>
                <h3 className="font-semibold text-stone-900 mt-2 mb-2">{s.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-orange-500 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
            Ready to fill your calendar?
          </h2>
          <p className="text-orange-100 mb-8">
            Plans start at €9/month. Set up your booking page in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="rounded-xl bg-white px-6 py-3 text-base font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-orange-300 px-6 py-3 text-base font-medium text-white hover:bg-orange-600 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <BukanoLogo size={28} />
            <span className="text-white font-semibold" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>Bukano</span>
          </Link>
          <div className="flex flex-wrap justify-center gap-5 text-sm text-stone-400">
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/refunds" className="hover:text-white transition-colors">Refunds</Link>
          </div>
          <p className="text-xs text-stone-600">© 2026 Senera-Soft DOO</p>
        </div>
      </footer>
    </div>
  )
}
