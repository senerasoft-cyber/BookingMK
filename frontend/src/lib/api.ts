import { clearTokens, getAccessToken, getRefreshToken, setAccessToken } from './tokens'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export class ApiError extends Error {
  status: number
  errors?: Record<string, string>

  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export async function parseErrorBody(
  response: Response,
): Promise<{ message: string; errors?: Record<string, string> }> {
  try {
    const body = await response.json()
    if (body.errors) {
      const firstMessage = Object.values(body.errors)[0]
      return {
        message: typeof firstMessage === 'string' ? firstMessage : 'Request failed',
        errors: body.errors,
      }
    }
    if (body.error) return { message: body.error }
    if (body.message) return { message: body.message }
  } catch {
    // response had no JSON body
  }
  return { message: `Request failed with status ${response.status}` }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!response.ok) return null

  const data = await response.json()
  setAccessToken(data.access_token)
  return data.access_token as string
}

type RequestOptions = {
  method?: string
  body?: unknown
  auth?: boolean
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && auth) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } else {
      clearTokens()
    }
  }

  if (!response.ok) {
    const { message, errors } = await parseErrorBody(response)
    throw new ApiError(response.status, message, errors)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function apiGet<T>(path: string, auth = false): Promise<T> {
  return apiRequest<T>(path, { auth })
}

export function apiPost<T>(path: string, body?: unknown, auth = false): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body, auth })
}

export function apiPatch<T>(path: string, body?: unknown, auth = false): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body, auth })
}

export function apiPut<T>(path: string, body?: unknown, auth = false): Promise<T> {
  return apiRequest<T>(path, { method: 'PUT', body, auth })
}

export function apiDelete<T>(path: string, auth = false): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE', auth })
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (response.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${newToken}` },
        body: formData,
      })
    } else {
      clearTokens()
    }
  }

  if (!response.ok) {
    const { message, errors } = await parseErrorBody(response)
    throw new ApiError(response.status, message, errors)
  }
  return response.json() as Promise<T>
}
