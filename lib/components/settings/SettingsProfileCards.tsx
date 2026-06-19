import { ActivityIndicator, Image, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SettingsForm } from '../../api/settings'
import { CATEGORIE, COLORI_BRAND, TONI } from '../../features/settings/constants'
import { settingsStyles as styles } from './settingsStyles'

type Props = {
  form: SettingsForm
  logoUrl: string
  uploadingLogo: boolean
  onSetField: (key: string, val: string) => void
  onPatchForm: (patch: Partial<SettingsForm>) => void
  onScegliLogo: () => void
}

export function SettingsProfileCards({ form, logoUrl, uploadingLogo, onSetField, onPatchForm, onScegliLogo }: Props) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dati azienda</Text>
        <Text style={styles.label}>NOME / AZIENDA</Text>
        <TextInput style={styles.input} value={form.nome_azienda} onChangeText={v => onSetField('nome_azienda', v)} placeholder="es. Galmazzi Videomaker" placeholderTextColor="#9CA3AF" />
        <Text style={styles.label}>CITTÀ</Text>
        <TextInput style={styles.input} value={form.citta} onChangeText={v => onSetField('citta', v)} placeholder="es. Roma" placeholderTextColor="#9CA3AF" />
        <Text style={styles.label}>P.IVA</Text>
        <TextInput style={styles.input} value={form.piva} onChangeText={v => onSetField('piva', v)} placeholder="es. 12345678901" placeholderTextColor="#9CA3AF" keyboardType="numeric" />
        <Text style={styles.label}>TELEFONO</Text>
        <TextInput style={styles.input} value={form.telefono} onChangeText={v => onSetField('telefono', v)} placeholder="es. 339 1234567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Categoria</Text>
        <View style={styles.chips}>
          {CATEGORIE.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, form.categoria === c && styles.chipActive]} onPress={() => onSetField('categoria', c)}>
              <Text style={[styles.chipText, form.categoria === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tono di comunicazione</Text>
        <View style={styles.chips}>
          {TONI.map(t => (
            <TouchableOpacity key={t} style={[styles.chip, form.tono === t && styles.chipActive]} onPress={() => onSetField('tono', t)}>
              <Text style={[styles.chipText, form.tono === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Logo aziendale</Text>
        <Text style={styles.cardSub}>Appare nell'intestazione di tutti i preventivi PDF</Text>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logoPreview} resizeMode="contain" />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoPlaceholderText}>Nessun logo caricato</Text>
          </View>
        )}
        <TouchableOpacity style={[styles.logoBtn, uploadingLogo && styles.saveBtnDisabled]} onPress={onScegliLogo} disabled={uploadingLogo}>
          {uploadingLogo
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.logoBtnText}>{logoUrl ? '🔄 Cambia logo' : '📷 Carica logo'}</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎨 Colore brand</Text>
        <Text style={styles.cardSub}>Usato nell'intestazione e nei dettagli del PDF</Text>
        <View style={styles.coloriGrid}>
          {COLORI_BRAND.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.coloreChip, { backgroundColor: '#' + c }, form.colore_brand === c && styles.coloreChipActive]}
              onPress={() => onSetField('colore_brand', c)}
            >
              {form.colore_brand === c && <Text style={styles.coloreChipCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>CODICE HEX PERSONALIZZATO</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.colore_brand}
            onChangeText={v => onSetField('colore_brand', v.replace('#', '').toUpperCase())}
            placeholder="es. 0D1B2A"
            placeholderTextColor="#9CA3AF"
            maxLength={6}
            autoCapitalize="characters"
          />
          <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#' + (form.colore_brand || '0D1B2A') }} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💳 Note pagamento</Text>
        <Text style={styles.cardSub}>Appare in fondo a tutti i preventivi PDF</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' as const }]}
          value={form.note_pagamento}
          onChangeText={v => onSetField('note_pagamento', v)}
          placeholder="es. Pagamento 50% anticipato, saldo alla consegna"
          placeholderTextColor="#9CA3AF"
          multiline
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>✍️ Firma</Text>
        <Text style={styles.cardSub}>Nome in corsivo elegante in fondo al PDF</Text>
        <TextInput
          style={styles.input}
          value={form.firma_nome}
          onChangeText={v => onSetField('firma_nome', v)}
          placeholder="es. Mario Rossi"
          placeholderTextColor="#9CA3AF"
        />
        {form.firma_nome ? (
          <Text style={styles.firmaPreview}>{form.firma_nome}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Firma digitale — reminder</Text>
        <Text style={styles.cardSub}>Quanti giorni dopo l'invio chiederti se mandare un promemoria al cliente</Text>
        <Text style={styles.label}>GIORNI PRIMA DEL REMINDER</Text>
        <TextInput
          style={styles.input}
          value={String(form.reminder_firma_giorni)}
          onChangeText={v => onPatchForm({ reminder_firma_giorni: Math.max(1, Number(v) || 3) })}
          keyboardType="number-pad"
          placeholder="3"
          placeholderTextColor="#9CA3AF"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={{ flex: 1, fontSize: 13, color: '#6B7280', marginRight: 12 }}>
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
