import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function Pagamenti() {
  const [metodi, setMetodi] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<any | null>(null)
  const [form, setForm] = useState({ tipo: 'bonifico', nome: '', dati: {} as any, predefinito: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => { carica() }, [])

  async function carica() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('metodi_pagamento').select('*').eq('user_id', user.id).order('predefinito', { ascending: false })
    if (data) setMetodi(data)
  }

  function nuovo() {
    setEdit(null)
    setForm({ tipo: 'bonifico', nome: '', dati: {}, predefinito: false })
    setModal(true)
  }

  function modifica(m: any) {
    setEdit(m)
    setForm({ tipo: m.tipo, nome: m.nome, dati: m.dati || {}, predefinito: !!m.predefinito })
    setModal(true)
  }

  async function salva() {
    if (!form.nome.trim()) { Alert.alert('Errore', 'Inserisci un nome'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const payload = { user_id: user.id, tipo: form.tipo, nome: form.nome.trim(), dati: form.dati, predefinito: form.predefinito }
    if (form.predefinito) {
      const { error } = await supabase.from('metodi_pagamento').update({ predefinito: false }).eq('user_id', user.id)
      if (error) { setSaving(false); Alert.alert('Errore', error.message); return }
    }
    const { error } = edit
      ? await supabase.from('metodi_pagamento').update(payload).eq('id', edit.id)
      : await supabase.from('metodi_pagamento').insert(payload)
    if (error) { setSaving(false); Alert.alert('Errore', error.message); return }
    setSaving(false)
    setModal(false)
    carica()
  }

  async function elimina(id: string) {
    Alert.alert('Elimina', 'Vuoi eliminare questo metodo?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await supabase.from('metodi_pagamento').delete().eq('id', id)
        setMetodi(m => m.filter(x => x.id !== id))
      }}
    ])
  }

  function icon(tipo: string) {
    return tipo === 'bonifico' ? '🏦' : tipo === 'paypal' ? '💙' : tipo === 'contanti' ? '💵' : '💳'
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Metodi di pagamento</Text>
        <TouchableOpacity onPress={nuovo}><Text style={styles.add}>+</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {metodi.length === 0 ? (
          <TouchableOpacity style={styles.empty} onPress={nuovo}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>Nessun metodo configurato</Text>
            <Text style={styles.emptySub}>Tocca + per aggiungere bonifico, PayPal, contanti, carta o Stripe</Text>
          </TouchableOpacity>
        ) : metodi.map(m => (
          <View key={m.id} style={styles.card}>
            <Text style={styles.cardIcon}>{icon(m.tipo)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{m.nome}</Text>
              {m.tipo === 'bonifico' && m.dati?.iban && <Text style={styles.cardSub}>{m.dati.iban}</Text>}
              {m.tipo === 'paypal' && m.dati?.email && <Text style={styles.cardSub}>{m.dati.email}</Text>}
              {m.predefinito && <Text style={styles.default}>predefinito</Text>}
            </View>
            <TouchableOpacity onPress={() => modifica(m)}><Text style={styles.action}>✏️</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => elimina(m.id)}><Text style={styles.action}>🗑</Text></TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModal(false)}><Text style={styles.close}>✕</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{edit ? 'Modifica metodo' : 'Nuovo metodo'}</Text>
            <TouchableOpacity onPress={salva} disabled={saving}>{saving ? <ActivityIndicator color="#0E9F8E" /> : <Text style={styles.save}>Salva</Text>}</TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.label}>TIPO</Text>
            <View style={styles.chips}>
              {[
                { key: 'bonifico', label: '🏦 Bonifico' },
                { key: 'paypal', label: '💙 PayPal' },
                { key: 'contanti', label: '💵 Contanti' },
                { key: 'carta', label: '💳 Carta' },
                { key: 'stripe', label: '🔗 Stripe link' },
              ].map(t => (
                <TouchableOpacity key={t.key} style={[styles.chip, form.tipo === t.key && styles.chipActive]} onPress={() => setForm(f => ({ ...f, tipo: t.key, dati: {} }))}>
                  <Text style={[styles.chipText, form.tipo === t.key && styles.chipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>NOME *</Text>
            <TextInput style={styles.input} value={form.nome} onChangeText={v => setForm(f => ({ ...f, nome: v }))} placeholder="es. Conto principale" placeholderTextColor="#9CA3AF" />
            {form.tipo === 'bonifico' && (
              <>
                <Text style={styles.label}>IBAN</Text>
                <TextInput style={styles.input} value={form.dati?.iban || ''} onChangeText={v => setForm(f => ({ ...f, dati: { ...f.dati, iban: v.toUpperCase() } }))} autoCapitalize="characters" placeholder="IT60..." placeholderTextColor="#9CA3AF" />
                <Text style={styles.label}>INTESTATARIO</Text>
                <TextInput style={styles.input} value={form.dati?.intestatario || ''} onChangeText={v => setForm(f => ({ ...f, dati: { ...f.dati, intestatario: v } }))} placeholder="Mario Rossi" placeholderTextColor="#9CA3AF" />
              </>
            )}
            {form.tipo === 'paypal' && (
              <>
                <Text style={styles.label}>EMAIL PAYPAL</Text>
                <TextInput style={styles.input} value={form.dati?.email || ''} onChangeText={v => setForm(f => ({ ...f, dati: { ...f.dati, email: v } }))} keyboardType="email-address" autoCapitalize="none" placeholder="mail@example.com" placeholderTextColor="#9CA3AF" />
              </>
            )}
            <TouchableOpacity style={styles.defaultRow} onPress={() => setForm(f => ({ ...f, predefinito: !f.predefinito }))}>
              <Text style={styles.defaultBox}>{form.predefinito ? '✓' : ''}</Text>
              <Text style={styles.defaultText}>Imposta come predefinito</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { backgroundColor: '#0D1B2A', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#9CA3AF', fontSize: 22, width: 40 },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  add: { color: '#0E9F8E', fontSize: 28, width: 40, textAlign: 'right' },
  content: { padding: 16, gap: 12 },
  empty: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B2A', marginTop: 8 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  default: { fontSize: 11, color: '#0E9F8E', fontWeight: '700', marginTop: 3 },
  action: { fontSize: 18, padding: 4 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  close: { fontSize: 22, color: '#6B7280', width: 50 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B2A' },
  save: { fontSize: 15, color: '#0E9F8E', fontWeight: '700', width: 50, textAlign: 'right' },
  modalContent: { padding: 16, gap: 12 },
  label: { fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  input: { backgroundColor: '#F7F8FA', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, fontSize: 14, color: '#0D1B2A' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  chipText: { color: '#374151', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#F7F8FA', borderRadius: 12 },
  defaultBox: { width: 22, height: 22, borderRadius: 4, backgroundColor: '#0E9F8E', color: '#fff', textAlign: 'center', fontWeight: '700' },
  defaultText: { fontSize: 14, color: '#0D1B2A', fontWeight: '500' },
})
