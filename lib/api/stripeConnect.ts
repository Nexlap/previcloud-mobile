import { BACKEND_URL } from '../constants'
import { sessionToken } from './settings'

export type StripeOnboardingStatus = 'non_connesso' | 'in_attesa' | 'verificato'

export type StripeAccountStato = {
  stripe_onboarding_status: StripeOnboardingStatus
  stripe_charges_enabled: boolean
}

export function stripeCallbackUrl(): string {
  return 'https://preventivoai-web.vercel.app/stripe-callback'
}
async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await sessionToken()
  if (!token) throw new Error('Non autenticato')

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Errore Stripe')
  return data as T
}

export async function connettiAccount(): Promise<{ stripe_account_id: string }> {
  return authFetch('/api/stripe/connetti-account', { method: 'POST' })
}

export async function creaOnboardingLink(): Promise<{ url: string }> {
  const callbackUrl = stripeCallbackUrl()
  const return_url = callbackUrl
  const refresh_url = callbackUrl
  console.log('[stripeConnect] creaOnboardingLink return_url:', return_url)
  console.log('[stripeConnect] creaOnboardingLink refresh_url:', refresh_url)
  return authFetch('/api/stripe/onboarding-link', {
    method: 'POST',
    body: JSON.stringify({
      return_url,
      refresh_url,
    }),
  })
}

export async function statoAccount(): Promise<StripeAccountStato> {
  return authFetch('/api/stripe/stato-account')
}
