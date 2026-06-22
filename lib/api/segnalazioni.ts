const ETICHETTE_SCHERMATA: Record<string, string> = {
  '/': 'Home',
  '/storico': 'Storico',
  '/clienti': 'Clienti',
  '/nuovo': 'Nuovo preventivo',
  '/screens/builder': 'Builder',
  '/screens/settings': 'Impostazioni',
  '/screens/profilo': 'Profilo',
  '/screens/preventivo-pdf': 'Anteprima PDF',
  '/screens/cliente-dettaglio': 'Dettaglio cliente',
  '/screens/cestino': 'Cestino',
  '/screens/registra': 'Registra',
  '/screens/listino': 'Listino servizi',
  '/screens/pagamenti': 'Metodi di pagamento',
  '/screens/messaggi-cliente': 'Messaggi cliente',
  '/screens/fiscale': 'Regime fiscale',
  '/onboarding': 'Onboarding',
}

export function etichettaSchermata(pathname: string): string {
  if (ETICHETTE_SCHERMATA[pathname]) return ETICHETTE_SCHERMATA[pathname]
  if (pathname.startsWith('/screens/cliente-dettaglio')) return 'Dettaglio cliente'
  if (pathname.startsWith('/nuovo')) return 'Nuovo preventivo'
  if (pathname.startsWith('/screens/')) return pathname.replace('/screens/', '')
  return pathname
}
