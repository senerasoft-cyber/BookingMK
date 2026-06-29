import { ApiError } from './api'

export function planErrorMessage(t: (key: string) => string, err: unknown): string {
  if (err instanceof ApiError) {
    const key = `dashboard.planErrors.${err.message}`
    const translated = t(key)
    return translated === key ? err.message : translated
  }
  return t('common.somethingWentWrong')
}
