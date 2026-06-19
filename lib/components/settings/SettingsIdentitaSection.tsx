import { useState } from 'react'
import {
  ActivityIndicator, Image, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { SettingsForm } from '../../api/settings'
import { CATEGORIE } from '../../features/settings/constants'
import { useSettingsTheme } from '../../hooks/useSettingsTheme'
import { settingsStyles as styles } from './settingsStyles'

type SubTab = 'logo' | 'dati' | 'firma' | 'categoria'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'logo', label: 'Logo' },
  { id: 'dati', label: 'Dati' },
  { id: 'firma', label: 'Firma' },
  { id: 'categoria', label: 'Categoria' },
]

type Props = {
  form: SettingsForm
  logoUrl: string
  uploadingLogo: boolean
  onSetField: (key: string, val: string) => void
  onScegliLogo: () => void
}

export function SettingsIdentitaSection({ form, logoUrl, uploadingLogo, onSetField, onScegliLogo }: Props) {
  const t = useSettingsTheme()
  const ph = t.sub.color as string
  const [expanded, setExpanded] = useState(true)
  const [subTab, setSubTab] = useState<SubTab>('logo')

  return (
    <View style={[styles.settingsPanel, t.card]}>
      <TouchableOpacity
        style={styles.settingsPanelHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={[styles.settingsRowLabel, t.title]}>Identità azienda</Text>
        <Text style={{ fontSize: 18, color: t.icon }}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {expanded ? (
        <>
          <View style={[styles.settingsSubTabs, { borderBottomColor: t.input.borderColor }]}>
            {SUB_TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.settingsSubTab, subTab === tab.id && styles.settingsSubTabActive]}
                onPress={() => setSubTab(tab.id)}
              >
                <Text style={[
                  styles.settingsSubTabText,
                  { color: subTab === tab.id ? '#0E9F8E' : t.sub.color },
                  subTab === tab.id && { fontWeight: '700' },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.settingsPanelBody}>
            {subTab === 'logo' ? (
              <>
                <Text style={[styles.cardSub, t.sub]}>Appare nell'intestazione di tutti i preventivi PDF</Text>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={[styles.logoPreview, { backgroundColor: t.input.backgroundColor }]} resizeMode="contain" />
                ) : (
                  <View style={[styles.logoPlaceholder, { backgroundColor: t.input.backgroundColor, borderColor: t.input.borderColor }]}>
                    <Text style={[styles.logoPlaceholderText, t.sub]}>Nessun logo caricato</Text>
                  </View>
                )}
                <TouchableOpacity style={[styles.logoBtn, uploadingLogo && styles.saveBtnDisabled]} onPress={onScegliLogo} disabled={uploadingLogo}>
                  {uploadingLogo
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.logoBtnText}>{logoUrl ? 'Cambia logo' : 'Carica logo'}</Text>
                  }
                </TouchableOpacity>
              </>
            ) : null}

            {subTab === 'dati' ? (
              <>
                <Text style={[styles.label, t.label]}>NOME / AZIENDA</Text>
                <TextInput style={[styles.input, t.input]} value={form.nome_azienda} onChangeText={v => onSetField('nome_azienda', v)} placeholder="es. Galmazzi Videomaker" placeholderTextColor={ph} />
                <Text style={[styles.label, t.label]}>CITTÀ</Text>
                <TextInput style={[styles.input, t.input]} value={form.citta} onChangeText={v => onSetField('citta', v)} placeholder="es. Roma" placeholderTextColor={ph} />
                <Text style={[styles.label, t.label]}>P.IVA</Text>
                <TextInput style={[styles.input, t.input]} value={form.piva} onChangeText={v => onSetField('piva', v)} placeholder="es. 12345678901" placeholderTextColor={ph} keyboardType="numeric" />
                <Text style={[styles.label, t.label]}>TELEFONO</Text>
                <TextInput style={[styles.input, t.input]} value={form.telefono} onChangeText={v => onSetField('telefono', v)} placeholder="es. 339 1234567" placeholderTextColor={ph} keyboardType="phone-pad" />
              </>
            ) : null}

            {subTab === 'firma' ? (
              <>
                <Text style={[styles.cardSub, t.sub]}>Nome in corsivo elegante in fondo al PDF</Text>
                <TextInput
                  style={[styles.input, t.input]}
                  value={form.firma_nome}
                  onChangeText={v => onSetField('firma_nome', v)}
                  placeholder="es. Mario Rossi"
                  placeholderTextColor={ph}
                />
                {form.firma_nome ? <Text style={styles.firmaPreview}>{form.firma_nome}</Text> : null}
              </>
            ) : null}

            {subTab === 'categoria' ? (
              <>
                <Text style={[styles.cardSub, t.sub]}>Settore di attività per personalizzare i preventivi</Text>
                <View style={[styles.input, t.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: 14, color: t.title.color, textTransform: 'capitalize' as const }}>{form.categoria}</Text>
                </View>
                <View style={{ gap: 6, marginTop: 4 }}>
                  {CATEGORIE.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.modalOption,
                        form.categoria === c && { backgroundColor: t.input.backgroundColor },
                      ]}
                      onPress={() => onSetField('categoria', c)}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        t.title,
                        form.categoria === c && { color: '#0E9F8E', fontWeight: '600' },
                        { textTransform: 'capitalize' as const },
                      ]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  )
}
