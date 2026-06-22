import * as Linking from 'expo-linking'
import { BACKEND_URL } from '../constants'
import { sessionToken } from './settings'

export type StripeOnboardingStatus = 'non_connesso' | 'in_attesa' | 'verificato'

export type StripeAccountStato = {
  stripe_onboarding_status: StripeOnboardingStatus
  stripe_charges_enabled: boolean
}

const STRIPE_ONBOARDING_WEB_CALLBACK = 'https://preventivoai-web.vercel.app/stripe-callback'

/** Deep link in-app (deve coincidere con la rotta app/stripe-callback.tsx). */
export function stripeCallbackUrl(): string {
  const url = Linking.createURL('stripe-callback')
  console.log('[STRIPE_DEBUG] deep link generato:', url)
  return url
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
  const return_url = STRIPE_ONBOARDING_WEB_CALLBACK
  const refresh_url = STRIPE_ONBOARDING_WEB_CALLBACK
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
