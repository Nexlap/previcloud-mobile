import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { ServizioForm } from '../../types'
import { formatImportoEuroVisuale } from 'previcloud-shared'
import { ESEMPI_LISTINO, UNITA } from '../../features/onboarding/constants'
import { OnboardingStepper } from './OnboardingStepper'
import { onboardingStyles as styles } from './onboardingStyles'

type NuovoServizio = { nome: string; descrizione: string; costo: string; unita: string }

type Props = {
  stepMassimoRaggiunto: number
  categoria: string
  modalitaServizi: 'testo' | 'manuale'
  listinoTab: 'testo' | 'foto' | 'vocale'
  testoServizi: string
  servizi: Omit<ServizioForm, 'id'>[]
  nuovoServizio: NuovoServizio
  elaborando: boolean
  elaborandoMedia: boolean
  registrando: boolean
  onModalitaServiziChange: (v: 'testo' | 'manuale') => void
  onListinoTabChange: (v: 'testo' | 'foto' | 'vocale') => void
  onTestoServiziChange: (v: string) => void
  onNuovoServizioChange: (v: NuovoServizio) => void
  onElaboraServiziAI: () => void
  onGestisciFoto: (sorgente: 'galleria' | 'camera') => void
  onToggleRegistrazione: () => void
  onRimuoviServizio: (i: number) => void
  onAggiungiServizio: () => void
  onNavigate: (s: number) => void
  canNavigate: (s: number) => boolean
  onNext: () => void
}

export function OnboardingServiziStep({
  stepMassimoRaggiunto,
  categoria,
  modalitaServizi,
  listinoTab,
  testoServizi,
  servizi,
  nuovoServizio,
  elaborando,
  elaborandoMedia,
  registrando,
  onModalitaServiziChange,
  onListinoTabChange,
  onTestoServiziChange,
  onNuovoServizioChange,
  onElaboraServiziAI,
  onGestisciFoto,
  onToggleRegistrazione,
  onRimuoviServizio,
  onAggiungiServizio,
  onNavigate,
  canNavigate,
  onNext,
}: Props) {
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.stepHeader}>
        <OnboardingStepper stepAttuale={3} stepMassimoRaggiunto={stepMassimoRaggiunto} onNavigate={onNavigate} canNavigate={canNavigate} />
      </View>
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>I tuoi servizi</Text>
        <Text style={styles.stepSub}>Claude userà questi prezzi per ogni preventivo</Text>

        <View style={styles.modalitaTabs}>
          {([['testo', '📋 Incolla'] , ['foto', '📷 Foto'], ['vocale', '🎙 Vocale'], ['manuale', '✏️ Manuale']] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.modalitaTab, ((key === 'manuale' && modalitaServizi === 'manuale') || (key !== 'manuale' && listinoTab === key && modalitaServizi !== 'manuale')) && styles.modalitaTabActive]}
              onPress={() => {
                if (key === 'manuale') { onModalitaServiziChange('manuale') }
                else { onModalitaServiziChange('testo'); onListinoTabChange(key) }
              }}
            >
              <Text style={[styles.modalitaTabText, ((key === 'manuale' && modalitaServizi === 'manuale') || (key !== 'manuale' && listinoTab === key && modalitaServizi !== 'manuale')) && styles.modalitaTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {modalitaServizi === 'testo' && listinoTab === 'testo' && (
          <View style={styles.testoServiziBox}>
            <Text style={styles.testoServiziHint}>
              Incolla il tuo listino prezzi — anche disordinato. Claude lo struttura automaticamente.
            </Text>
            <TextInput
              style={styles.testoServiziInput}
              value={testoServizi}
              onChangeText={onTestoServiziChange}
              multiline
              textAlignVertical="top"
              placeholder={categoria && ESEMPI_LISTINO[categoria] ? `es.\n${ESEMPI_LISTINO[categoria]}` : 'es.\nServizio 1: 100€\nServizio 2: 200€/ora\nServizio 3: 50€/cad'}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={[styles.elaboraBtn, (!testoServizi.trim() || elaborando) && styles.nextBtnDisabled]}
              onPress={onElaboraServiziAI}
              disabled={!testoServizi.trim() || elaborando}
            >
              {elaborando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.elaboraBtnText}>🤖 Struttura con AI</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {modalitaServizi === 'testo' && listinoTab === 'foto' && (
          <View style={{ gap: 12, marginBottom: 80 }}>
            <Text style={styles.testoServiziHint}>Scatta o carica una foto del tuo listino — anche scritto a mano.</Text>
            <TouchableOpacity
              style={[styles.testoServiziInput, { height: 120, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' }]}
              onPress={() => onGestisciFoto('galleria')}
            >
              {elaborandoMedia ? <ActivityIndicator color="#0E9F8E" /> : <>
                <Text style={{ fontSize: 32 }}>📷</Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Scegli dalla galleria</Text>
              </>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.elaboraBtn, elaborandoMedia && styles.nextBtnDisabled]}
              disabled={elaborandoMedia}
              onPress={() => onGestisciFoto('camera')}
            >
              <Text style={styles.elaboraBtnText}>📸 Scatta una foto</Text>
            </TouchableOpacity>
          </View>
        )}

        {modalitaServizi === 'testo' && listinoTab === 'vocale' && (
          <View style={{ gap: 12, alignItems: 'center' }}>
            <Text style={styles.testoServiziHint}>Descrivi i tuoi servizi a voce — prezzi, nomi, unità. Claude trascrive e struttura tutto.</Text>
            <TouchableOpacity
              style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: registrando ? '#EF4444' : '#0D1B2A', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}
              onPress={onToggleRegistrazione}
            >
              {elaborandoMedia ? <ActivityIndicator color="#fff" size="large" /> : <Text style={{ fontSize: 32 }}>{registrando ? '⏹' : '🎙'}</Text>}
            </TouchableOpacity>
            <Text style={{ fontSize: 13, color: registrando ? '#EF4444' : '#9CA3AF', fontWeight: '500' }}>
              {elaborandoMedia ? 'Elaborazione...' : registrando ? 'Tocca per fermare' : 'Tocca per registrare'}
            </Text>
          </View>
        )}

        {modalitaServizi === 'manuale' && (
          <View style={styles.manualBox}>
            {servizi.map((s, i) => (
              <View key={i} style={styles.servizioItem}>
                <View style={styles.servizioItemLeft}>
                  <Text style={styles.servizioItemNome}>{s.nome}</Text>
                  {s.costo ? <Text style={styles.servizioItemCosto}>€{formatImportoEuroVisuale(parseFloat(s.costo) || 0)}/{s.unita}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => onRimuoviServizio(i)}>
                  <Text style={styles.servizioItemDel}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.nuovoServizioForm}>
              <TextInput
                style={styles.fieldInput}
                value={nuovoServizio.nome}
                onChangeText={v => onNuovoServizioChange({ ...nuovoServizio, nome: v })}
                placeholder="Nome servizio *"
                placeholderTextColor="#9CA3AF"
              />
              <View style={styles.costoUnitaRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  value={nuovoServizio.costo}
                  onChangeText={v => onNuovoServizioChange({ ...nuovoServizio, costo: v })}
                  placeholder="Costo €"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitaMiniChips}>
                  {UNITA.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitaMiniChip, nuovoServizio.unita === u && styles.unitaMiniChipActive]}
                      onPress={() => onNuovoServizioChange({ ...nuovoServizio, unita: u })}
                    >
                      <Text style={[styles.unitaMiniText, nuovoServizio.unita === u && styles.unitaMiniTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.aggiungiBtn, !nuovoServizio.nome.trim() && styles.nextBtnDisabled]}
                onPress={onAggiungiServizio}
                disabled={!nuovoServizio.nome.trim()}
              >
                <Text style={styles.aggiungiBtnText}>+ Aggiungi servizio</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.skipRow}>
          <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
            <Text style={styles.nextBtnText}>
              {servizi.length > 0 ? `Avanti — ${servizi.length} servizi →` : 'Avanti →'}
            </Text>
          </TouchableOpacity>
          {servizi.length === 0 && (
            <Text style={styles.skipNote}>Potrai aggiungere i servizi in seguito dalle impostazioni</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
