import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

import { apiGet, apiPost } from '../lib/api'
import { clearTokens, getAccessToken, setTokens } from '../lib/tokens'
import type { Business } from '../types'

type RegisterPayload = { email: string; password: string; business_name: string }
type LoginPayload = { email: string; password: string }

interface AuthContextValue {
  business: Business | null
  isAuthenticated: boolean
  isLoading: boolean
  register: (payload: RegisterPayload) => Promise<Business>
  login: (payload: LoginPayload) => Promise<Business>
  logout: () => void
  refreshBusiness: () => Promise<Business | null>
  setBusiness: (business: Business) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshBusiness = useCallback(async () => {
    if (!getAccessToken()) {
      setBusiness(null)
      return null
    }
    try {
      const data = await apiGet<Business>('/me/business', true)
      setBusiness(data)
      return data
    } catch {
      clearTokens()
      setBusiness(null)
      return null
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time auth check on mount
    refreshBusiness().finally(() => setIsLoading(false))
  }, [refreshBusiness])

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await apiPost<{ access_token: string; refresh_token: string }>(
      '/auth/register',
      payload,
    )
    setTokens(data.access_token, data.refresh_token)
    const fetched = await apiGet<Business>('/me/business', true)
    setBusiness(fetched)
    return fetched
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await apiPost<{ access_token: string; refresh_token: string }>(
      '/auth/login',
      payload,
    )
    setTokens(data.access_token, data.refresh_token)
    const fetched = await apiGet<Business>('/me/business', true)
    setBusiness(fetched)
    return fetched
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setBusiness(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        business,
        isAuthenticated: business !== null,
        isLoading,
        register,
        login,
        logout,
        refreshBusiness,
        setBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook live together by convention
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
