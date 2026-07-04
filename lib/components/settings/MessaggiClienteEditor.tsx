import { useState, type ReactNode } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import {
  MESSAGGI_CLIENTE_DEFAULT,
  SCENARI_MESSAGGIO,
  anteprimaMessaggio,
  type MessaggiClienteTemplates,
  type ScenarioMessaggio,
} from 'previcloud-shared'
import { useSettingsTheme } from '../../hooks/useSettingsTheme'
import { FirmaReminderPanel } from './FirmaReminderPanel'
import { MessaggioTemplateEditor } from './MessaggioTemplateEditor'
import { settingsStyles as styles } from './settingsStyles'

type Props = {
  messaggi: MessaggiClienteTemplates
  onChange: (messaggi: MessaggiClienteTemplates) => void
  reminderGiorni?: number
  reminderDisabilitato?: boolean
  onReminderGiorniChange?: (giorni: number) => void
  onReminderDisabilitatoChange?: (v: boolean) => void
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  const t = useSettingsTheme()
  return (
    <View style={[styles.card, t.card, { gap: 12 }]}>
      <Text style={[styles.cardTitle, t.title]}>{title}</Text>
      {children}
    </View>
  )
}

export function MessaggiClienteEditor({
  messaggi,
  onChange,
  reminderGiorni = 3,
  reminderDisabilitato = false,
  onReminderGiorniChange,
  onReminderDisabilitatoChange,
}: Props) {
  const t = useSettingsTheme()
  const [scenario, setScenario] = useState<ScenarioMessaggio>('firma')
  const config = SCENARI_MESSAGGIO.find(s => s.id === scenario) ?? SCENARI_MESSAGGIO[1]
  const campoAnteprima = config.campi[0].key

  function aggiornaCampo(key: keyof MessaggiClienteTemplates, valore: string) {
    onChange({ ...messaggi, [key]: valore })
  }

  function ripristinaScenario() {
    const patch = Object.fromEntries(config.campi.map(c => [c.key, MESSAGGI_CLIENTE_DEFAULT[c.key]]))
    onChange({ ...messaggi, ...patch })
  }

  return (
    <View style={{ gap: 14 }}>
      <SectionCard title="Tipo di invio">
        <View style={[styles.settingsSubTabs, { borderBottomColor: t.input.borderColor, borderBottomWidth: 1 }]}>
          {SCENARI_MESSAGGIO.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.settingsSubTab, scenario === s.id && styles.settingsSubTabActive]}
              onPress={() => setScenario(s.id)}
            >
              <Text
                style={[
                  styles.settingsSubTabText,
                  { color: scenario === s.id ? '#0B7A6D' : t.sub.color },
                  scenario === s.id && { fontWeight: '700' },
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.cardSub, t.sub, { marginTop: 10 }]}>{config.desc}</Text>
      </SectionCard>
      {scenario === 'reminder' && onReminderGiorniChange && onReminderDisabilitatoChange ? (
        <FirmaReminderPanel
          giorni={reminderGiorni}
          disabilitato={reminderDisabilitato}
          onGiorniChange={onReminderGiorniChange}
          onDisabilitatoChange={onReminderDisabilitatoChange}
        />
      ) : null}

      <SectionCard title="Template messaggio">
        {config.campi.map(campo => (
          <View key={campo.key} style={{ gap: 6 }}>
            <Text style={[styles.label, t.label]}>{campo.label.toUpperCase()}</Text>
            <MessaggioTemplateEditor
              tipo={campo.key}
              value={messaggi[campo.key]}
              onChange={(valore) => aggiornaCampo(campo.key, valore)}
              multiline={campo.multiline}
            />
          </View>
        ))}
        <TouchableOpacity onPress={ripristinaScenario} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          <Text style={{ fontSize: 13, color: '#0B7A6D', fontWeight: '600' }}>Ripristina predefinito</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard title="Anteprima">
        <View style={[styles.messaggioPreviewBox, { backgroundColor: t.input.backgroundColor, borderColor: t.input.borderColor }]}>
          <Text style={[styles.messaggioPreviewText, { color: t.title.color }]}>
            {anteprimaMessaggio(campoAnteprima, messaggi[campoAnteprima])}
          </Text>
        </View>
        {config.campi.length > 1 ? (
          <Text style={[styles.cardSub, t.sub]}>
            Oggetto email: {anteprimaMessaggio(config.campi[1].key, messaggi[config.campi[1].key])}
          </Text>
        ) : null}
      </SectionCard>
    </View>
  )
}
