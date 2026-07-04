import { ActivityIndicator, Image, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SettingsForm } from '../../api/settings'
import { CATEGORIE, COLORI_BRAND, TONI } from '../../features/settings/constants'
import { useSettingsTheme } from '../../hooks/useSettingsTheme'
import { AppIcon } from '../icons/AppIcon'
import { settingsStyles as styles } from './settingsStyles'

type Props = {
  form: SettingsForm
  logoUrl: string
  uploadingLogo: boolean
  onSetField: (key: string, val: string) => void
  onPatchForm: (patch: Partial<SettingsForm>) => void
  onScegliLogo: () => void
}

// unused
export function SettingsProfileCards({ form, logoUrl, uploadingLogo, onSetField, onPatchForm, onScegliLogo }: Props) {
  const t = useSettingsTheme()
  const ph = t.sub.color as string

  return (
    <>
      {/* 1. Logo — come desktop */}
      <View style={[styles.card, t.card]}>
        <Text style={[styles.cardTitle, t.title]}>Logo aziendale</Text>
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
      </View>

      {/* 2. Dati anagrafici */}
      <View style={[styles.card, t.card]}>
        <Text style={[styles.cardTitle, t.title]}>Dati azienda</Text>
        <Text style={[styles.label, t.label]}>NOME / AZIENDA</Text>
        <TextInput style={[styles.input, t.input]} value={form.nome_azienda} onChangeText={v => onSetField('nome_azienda', v)} placeholder="es. Galmazzi Videomaker" placeholderTextColor={ph} />
        <Text style={[styles.label, t.label]}>CITTÀ</Text>
        <TextInput style={[styles.input, t.input]} value={form.citta} onChangeText={v => onSetField('citta', v)} placeholder="es. Roma" placeholderTextColor={ph} />
        <Text style={[styles.label, t.label]}>P.IVA</Text>
        <TextInput style={[styles.input, t.input]} value={form.piva} onChangeText={v => onSetField('piva', v)} placeholder="es. 12345678901" placeholderTextColor={ph} keyboardType="numeric" />
        <Text style={[styles.label, t.label]}>TELEFONO</Text>
        <TextInput style={[styles.input, t.input]} value={form.telefono} onChangeText={v => onSetField('telefono', v)} placeholder="es. 339 1234567" placeholderTextColor={ph} keyboardType="phone-pad" />
      </View>

      {/* 3. Categoria */}
      <View style={[styles.card, t.card]}>
        <Text style={[styles.cardTitle, t.title]}>Categoria</Text>
        <View style={styles.chips}>
          {CATEGORIE.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, form.categoria === c && styles.chipActive]} onPress={() => onSetField('categoria', c)}>
              <Text style={[styles.chipText, form.categoria === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 4. Colore brand */}
      <View style={[styles.card, t.card]}>
        <Text style={[styles.cardTitle, t.title]}>Colore brand</Text>
        <Text style={[styles.cardSub, t.sub]}>Usato nell'intestazione e nei dettagli del PDF</Text>
        <View style={styles.coloriGrid}>
          {COLORI_BRAND.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.coloreChip, { backgroundColor: '#' + c }, form.colore_brand === c && styles.coloreChipActive]}
              onPress={() => onSetField('colore_brand', c)}
            >
              {form.colore_brand === c && <AppIcon name="check" size={16} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, t.label]}>CODICE HEX PERSONALIZZATO</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput
            style={[styles.input, t.input, { flex: 1 }]}
            value={form.colore_brand}
            onChangeText={v => onSetField('colore_brand', v.replace('#', '').toUpperCase())}
            placeholder="es. 0D1B2A"
            placeholderTextColor={ph}
            maxLength={6}
            autoCapitalize="characters"
          />
          <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#' + (form.colore_brand || '0D1B2A') }} />
        </View>
      </View>

      {/* 5. Tono AI */}
      <View style={[styles.card, t.card]}>
        <Text style={[styles.cardTitle, t.title]}>Tono di comunicazione</Text>
        <Text style={[styles.cardSub, t.sub]}>Usato dall'AI per generare i testi dei preventivi</Text>
        <View style={styles.chips}>
          {TONI.map(tono => (
            <TouchableOpacity key={tono} style={[styles.chip, form.tono === tono && styles.chipActive]} onPress={() => onSetField('tono', tono)}>
              <Text style={[styles.chipText, form.tono === tono && styles.chipTextActive]}>{tono}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 6–7. Contenuto PDF */}
      <View style={[styles.card, t.card]}>
        <Text style={[styles.cardTitle, t.title]}>Note pagamento</Text>
        <Text style={[styles.cardSub, t.sub]}>Appare in fondo a tutti i preventivi PDF</Text>
        <TextInput
          style={[styles.input, t.input, { height: 80, textAlignVertical: 'top' as const }]}
          value={form.note_pagamento}
          onChangeText={v => onSetField('note_pagamento', v)}
          placeholder="es. Pagamento 50% anticipato, saldo alla consegna"
          placeholderTextColor={ph}
          multiline
        />
      </View>

      <View style={[styles.card, t.card]}>
        <Text style={[styles.cardTitle, t.title]}>Firma</Text>
        <Text style={[styles.cardSub, t.sub]}>Nome in corsivo elegante in fondo al PDF</Text>
        <TextInput
          style={[styles.input, t.input]}
          value={form.firma_nome}
          onChangeText={v => onSetField('firma_nome', v)}
          placeholder="es. Mario Rossi"
          placeholderTextColor={ph}
        />
        {form.firma_nome ? (
          <Text style={styles.firmaPreview}>{form.firma_nome}</Text>
        ) : null}
      </View>

      {/* 8. Reminder firma digitale */}
      <View style={[styles.card, t.card]}>
        <Text style={[styles.cardTitle, t.title]}>Firma digitale — reminder</Text>
        <Text style={[styles.cardSub, t.sub]}>Quanti giorni dopo l'invio chiederti se mandare un promemoria al cliente</Text>
        <Text style={[styles.label, t.label]}>GIORNI PRIMA DEL REMINDER</Text>
        <TextInput
          style={[styles.input, t.input]}
          value={String(form.reminder_firma_giorni)}
          onChangeText={v => onPatchForm({ reminder_firma_giorni: Math.max(1, Number(v) || 3) })}
          keyboardType="number-pad"
          placeholder="3"
          placeholderTextColor={ph}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={{ flex: 1, fontSize: 13, color: t.sub.color, marginRight: 12 }}>
            Disabilita reminder firma (tutti i preventivi)
          </Text>
          <Switch
            value={form.reminder_firma_globale_disabilitato}
            onValueChange={v => onPatchForm({ reminder_firma_globale_disabilitato: v })}
            trackColor={{ false: '#D1D5DB', true: '#0E9F8E' }}
            thumbColor="#fff"
          />
        </View>
      </View>
    </>
  )
}
