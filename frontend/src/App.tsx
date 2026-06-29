import { Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/ProtectedRoute'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import AgendaPage from './pages/dashboard/AgendaPage'
import BillingPage from './pages/dashboard/BillingPage'
import BrandingPage from './pages/dashboard/BrandingPage'
import ClientsPage from './pages/dashboard/ClientsPage'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import HoursPage from './pages/dashboard/HoursPage'
import MarketingPage from './pages/dashboard/MarketingPage'
import ServicesPage from './pages/dashboard/ServicesPage'
import StatsPage from './pages/dashboard/StatsPage'
import SettingsPage from './pages/dashboard/SettingsPage'
import StaffPage from './pages/dashboard/StaffPage'
import HomePage from './pages/HomePage'
import PricingPage from './pages/PricingPage'
import PrivacyPage from './pages/legal/PrivacyPage'
import RefundPolicyPage from './pages/legal/RefundPolicyPage'
import TermsPage from './pages/legal/TermsPage'
import BillingStep from './pages/onboarding/BillingStep'
import BrandingStep from './pages/onboarding/BrandingStep'
import HoursStep from './pages/onboarding/HoursStep'
import LiveStep from './pages/onboarding/LiveStep'
import ModeStep from './pages/onboarding/ModeStep'
import OnboardingGate from './pages/onboarding/OnboardingGate'
import OnboardingLayout from './pages/onboarding/OnboardingLayout'
import ServicesStep from './pages/onboarding/ServicesStep'
import TypeStep from './pages/onboarding/TypeStep'
import ManageBookingPage from './pages/public/ManageBookingPage'
import StudioPage from './pages/public/StudioPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/refunds" element={<RefundPolicyPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminOverviewPage />
          </ProtectedRoute>
        }
      />
      <Route path="/b/:slug" element={<StudioPage />} />
      <Route path="/b/:slug/manage/:token" element={<ManageBookingPage />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OnboardingGate />} />
        <Route path="type" element={<TypeStep />} />
        <Route path="services" element={<ServicesStep />} />
        <Route path="hours" element={<HoursStep />} />
        <Route path="branding" element={<BrandingStep />} />
        <Route path="mode" element={<ModeStep />} />
        <Route path="billing" element={<BillingStep />} />
        <Route path="live" element={<LiveStep />} />
      </Route>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AgendaPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="hours" element={<HoursPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="marketing" element={<MarketingPage />} />
        <Route path="branding" element={<BrandingPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
