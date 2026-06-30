export type BookingMode = 'open' | 'approved_clients' | 'approve_every'
export type VerificationChannel = 'sms' | 'viber' | 'whatsapp' | 'email'
export type VocabKey = 'service' | 'medical' | 'session'

export interface Business {
  id: number
  name: string
  slug: string
  type_id: string | null
  vocab_key: VocabKey
  accent_key: string
  tagline: string | null
  logo_url: string | null
  cover_url: string | null
  locale_default: string
  currency: string
  booking_mode: BookingMode
  require_verification: boolean
  verification_channel: VerificationChannel
  collect_phone: boolean
  reminders_enabled: boolean
  reminder_lead_minutes: number
  address: string | null
  about_text: string | null
  contact_phone: string | null
  instagram_url: string | null
  facebook_url: string | null
  website_url: string | null
  gallery_urls: string[]
  marketing_enabled: boolean
  loyalty_enabled: boolean
  loyalty_every_n: number
  owner_pin_set: boolean
  plan_id: PlanId | null
  subscription_status: SubscriptionStatus
  subscription_provider: string | null
  current_period_end: string | null
  trial_started_at: string | null
  onboarding_step: number
  onboarding_completed_at: string | null
}

export type PlanId = 'basic' | 'mid' | 'top'
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled'

export interface Plan {
  id: PlanId
  name: string
  max_staff: number | null
  price_eur_monthly: number
  real_channels: boolean
  branding: boolean
  auto_notify: boolean
  white_label: boolean
  stats: boolean
  marketing_tools: boolean
}

export interface Service {
  id: number
  staff_id: number
  name: string
  duration_minutes: number
  price: number
  sort_order: number
  active: boolean
}

export interface Staff {
  id: number
  name: string
  bio: string | null
  photo_url: string | null
  active: boolean
  sort_order: number
  pin_set: boolean
  created_at: string
}

export interface PublicStaff {
  id: number
  name: string
  bio: string | null
  photo_url: string | null
}

export interface StaffTimeOff {
  id: number
  start_date: string
  end_date: string
  note: string | null
}

export interface WorkingHour {
  weekday: number
  open_minute: number
  close_minute: number
  slot_minutes: number
  is_closed: boolean
}

export interface BusinessTypeDefaultService {
  name_mk: string
  name_en: string
  duration_minutes: number
  price: number
}

export interface BusinessType {
  id: string
  label_mk: string
  label_en: string
  icon_key: string
  accent_key: string
  vocab_key: VocabKey
  default_services: BusinessTypeDefaultService[]
}

export interface PublicService {
  id: number
  name: string
  duration_minutes: number
  price: number
}

export interface PublicBusiness {
  name: string
  slug: string
  tagline: string | null
  logo_url: string | null
  cover_url: string | null
  accent_key: string
  vocab_key: VocabKey
  currency: string
  require_verification: boolean
  verification_channel: VerificationChannel
  collect_phone: boolean
  address: string | null
  about_text: string | null
  contact_phone: string | null
  instagram_url: string | null
  facebook_url: string | null
  website_url: string | null
  gallery_urls: string[]
  white_label: boolean
  staff: PublicStaff[]
  services: PublicService[]
}

export interface BookingResult {
  id: number
  status: 'pending' | 'confirmed'
  starts_at: string
  service_name: string
}

export interface VerifyStartResult {
  sent: boolean
  channel: VerificationChannel
  dev_code?: string
}

export interface VerifyCheckResult {
  verified: boolean
  verification_token: string
}

export interface Client {
  id: number
  name: string
  email: string | null
  phone_e164: string | null
  is_approved: boolean
  booking_count: number
  created_at: string
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Appointment {
  id: number
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  service_name: string
  service_price: number
  voucher_code: string | null
  staff_id: number | null
  staff_name: string | null
  source: string
  flagged_for_review: boolean
  client: Client
}

export interface StaffAuthResult {
  access_token: string
  staff: { id: number; name: string }
}

export type VoucherKind = 'percent_off' | 'free'

export interface Voucher {
  id: number
  client_id: number
  client_name: string | null
  code: string
  kind: VoucherKind
  percent_off: number | null
  source: 'manual' | 'loyalty'
  granted_at: string
  consumed_at: string | null
}
