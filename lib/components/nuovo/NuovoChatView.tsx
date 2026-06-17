import { RefObject } from 'react'
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Messaggio } from '../../types'
import { nuovoStyles as styles } from './nuovoStyles'

type Props = {
  scrollRef: RefObject<ScrollView | null>
  messaggi: Messaggio[]
  input: string
  loading: boolean
  onInputChange: (v: string) => void
  onInvia: () => void
}

export function NuovoChatView({
  scrollRef,
  messaggi,
  input,
  loading,
  onInputChange,
  onInvia,
}: Props) {
  return (
    <>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.chatContent}>
        {messaggi.length === 0 && (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatIcon}>💬</Text>
            <Text style={styles.emptyChatTitle}>Descrivi il lavoro</Text>
            <Text style={styles.emptyChatSub}>Anche vago — l'AI farà le domande giuste</Text>
          </View>
        )}
        {messaggi.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
            <Text style={styles.bubbleWho}>{m.role === 'user' ? 'Tu' : 'PreventivoAI'}</Text>
            <Text style={[styles.bubbleText, m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI]}>
              {m.content}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.bubbleAI]}>
            <Text style={styles.bubbleWho}>PreventivoAI</Text>
            <ActivityIndicator size="small" color="#0E9F8E" style={{ marginTop: 4 }} />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={onInputChange}
          placeholder="Descrivi il lavoro..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={onInvia}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}
