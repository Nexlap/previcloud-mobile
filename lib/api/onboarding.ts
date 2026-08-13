import { supabase } from '../supabase'
import { parseImportoEuro } from 'previcloud-shared'

type DemoProfile = {
  nome_azienda: string
  citta: string
  piva: string
  telefono: string
  firma_nome: string
}

type DemoCliente = {
  nome: string
  email: string
  telefono: string
  indirizzo: string
}

export async function tokenOnboarding() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

export async function generaPreviewOnboarding({
  backendUrl,
  token,
  testo,
  template,
  demoProfile,
  demoCliente,
}: {
  backendUrl: string
  token: string
  testo: string
  template: string
  demoProfile: DemoProfile
  demoCliente: DemoCliente
}) {
  const res = await fetch(`${backendUrl}/api/genera-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      testo,
      template,
      versione_padre_id: null,
      demo_profile: demoProfile,
      demo_cliente: demoCliente,
    })
  })

  return res.json()
}

export async function completaOnboarding({
  nomeAzienda,
  citta,
  categoria,
  templateScelto,
  firmaNome,
  servizi,
}: {
  nomeAzienda: string
  citta: string
  categoria: string
  templateScelto: string
  firmaNome: string
  servizi: Array<{ nome: string, descrizione: string, costo: string, unita: string }>
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: null }

  await supabase.from('profiles').upsert({
    id: user.id,
    nome_azienda: nomeAzienda.trim(),
    citta: citta.trim(),
    categoria,
    template_preferito: templateScelto,
    firma_nome: firmaNome.trim(),
    onboarding_completato: true,
  })

  if (servizi.length > 0) {
    const { error } = await supabase.from('servizi').insert(
      servizi.map((servizio, index) => ({
        user_id: user.id,
        nome: servizio.nome,
        descrizione: servizio.descrizione || null,
        costo: servizio.costo ? parseImportoEuro(servizio.costo) : null,
        unita: servizio.unita,
        ordine: index
      }))
    )
    return { user, error }
  }

  return { user, error: null }
}
