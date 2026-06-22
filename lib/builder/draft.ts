import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'
import { builderState } from './state'
import type { BuilderMemoryState } from './types'

export const BUILDER_DRAFT_KEY = 'preventivoai-builder-draft'

export type BuilderDraft = BuilderMemoryState & {
  clienteSelezionatoId: string
  clienteNome: string
  aggiornatoAt?: string
}

function withTimestamp(draft: BuilderDraft): BuilderDraft {
  return { ...draft, aggiornatoAt: new Date().toISOString() }
}

export function bozzaBuilderVuota(draft: BuilderDraft): boolean {
  return (
    !draft.noteExtra.trim() &&
    !draft.clienteSelezionatoId &&
    !draft.voci.some((v) => v.nome.trim())
  )
}

export function bozzaBuilderVuotaDaState(state: BuilderMemoryState & {
  clienteSelezionatoId?: string
}): boolean {
  return (
    !state.noteExtra.trim() &&
    !state.clienteSelezionatoId &&
    !state.voci.some((v) => v.nome.trim())
  )
}

export function messaggioRipresaBozza(draft: BuilderDraft): string {
  const nome = draft.clienteNome?.trim()
  if (nome) {
    return `Hai una bozza in corso per ${nome}.\n\nVuoi riprenderla o iniziare da zero?`
  }
  return 'Hai una bozza in corso non ancora generata.\n\nVuoi riprenderla o iniziare da zero?'
}

export function buildBuilderDraft(
  state: BuilderMemoryState,
  clienteSelezionatoId: string,
  clienteNome: string,
): BuilderDraft {
  return {
    ...state,
    clienteSelezionatoId,
    clienteNome,
  }
}

export function applicaBozzaABuilderState(draft: BuilderDraft) {
  builderState.voci = draft.voci
  builderState.nomeCliente = draft.nomeCliente
  builderState.noteExtra = draft.noteExtra
  builderState.includiIva = draft.includiIva
  builderState.trasferte = draft.trasferte
  builderState.mostraTrasferte = draft.mostraTrasferte
  builderState.nuovaSpesaNome = draft.nuovaSpesaNome
  builderState.nuovaSpesaImporto = draft.nuovaSpesaImporto
  builderState.nuoviKm = draft.nuoviKm
  builderState.abbonamentoAttivo = draft.abbonamentoAttivo
  builderState.abImporto = draft.abImporto
  builderState.abGiorno = draft.abGiorno
  builderState.abMeseInizio = draft.abMeseInizio
  builderState.abMensilita = draft.abMensilita
  builderState.abVisibileNelPDF = draft.abVisibileNelPDF
  builderState.pagamentoRateAttivo = draft.pagamentoRateAttivo
  builderState.rateNumero = draft.rateNumero
  builderState.rateGiornoScadenza = draft.rateGiornoScadenza
  builderState.rateMeseInizio = draft.rateMeseInizio
  builderState.rateVisibileNelPDF = draft.rateVisibileNelPDF
  builderState.metodoPagamentoNessuno = draft.metodoPagamentoNessuno
  builderState.metodoPagamentoId = draft.metodoPagamentoId
  builderState.nascondiPrezzi = draft.nascondiPrezzi ?? false
}

export async function caricaBozzaBuilder(): Promise<BuilderDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(BUILDER_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BuilderDraft
  } catch (e) {
    console.error('[builderDraft] JSON corrotto:', e)
    await AsyncStorage.removeItem(BUILDER_DRAFT_KEY)
    return null
  }
}

export async function salvaBozzaBuilder(draft: BuilderDraft): Promise<void> {
  if (bozzaBuilderVuota(draft)) {
    await cancellaBozzaBuilder()
    return
  }
  try {
    await AsyncStorage.setItem(BUILDER_DRAFT_KEY, JSON.stringify(withTimestamp(draft)))
  } catch (e) {
    console.error('[builderDraft] Salvataggio fallito:', e)
  }
}

export async function cancellaBozzaBuilder(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BUILDER_DRAFT_KEY)
  } catch (e) {
    console.error('[builderDraft] Cancellazione fallita:', e)
  }
}

export async function clienteIdUtilizzabile(clienteId: string | null | undefined): Promise<boolean> {
  if (!clienteId) return false
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data, error } = await supabase
    .from('clienti')
    .select('id')
    .eq('id', clienteId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return false
  return !!data
}
