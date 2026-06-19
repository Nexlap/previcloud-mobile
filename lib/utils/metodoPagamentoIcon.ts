import type { AppIconName } from '../components/icons/AppIcon'

export function metodoPagamentoFeatherIcon(tipo?: string): AppIconName {
  if (tipo === 'bonifico') return 'home'
  if (tipo === 'paypal') return 'mail'
  if (tipo === 'contanti') return 'dollar-sign'
  if (tipo === 'stripe') return 'link'
  if (tipo === 'carta') return 'credit-card'
  return 'credit-card'
}
