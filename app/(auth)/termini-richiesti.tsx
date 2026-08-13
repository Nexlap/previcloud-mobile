import { router } from 'expo-router'
import { currentUserId, resolvePostAuthRoute } from '../../lib/api/auth'
import { TerminiNonAccettatiContent } from '../../lib/components/TerminiNonAccettatiModal'

/**
 * Schermata standalone per il gate termini.
 * Usata da resolvePostAuthRoute() (login password, biometria, index) così il
 * controllo non dipende dall'evento Supabase SIGNED_IN vs TOKEN_REFRESHED.
 */
export default function TerminiRichiesti() {
  async function handleAccettati() {
    const userId = await currentUserId()
    if (!userId) {
      router.replace('/(auth)/login')
      return
    }
    router.replace(await resolvePostAuthRoute(userId))
  }

  return <TerminiNonAccettatiContent onAccettati={() => void handleAccettati()} />
}
