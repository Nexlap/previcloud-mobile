import type { AudioRecorder } from 'expo-audio'
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio'
import AudioModule from 'expo-audio/build/AudioModule'

export type { AudioRecorder }

export async function avviaRegistrazioneAudio(): Promise<AudioRecorder | null> {
  const { granted } = await requestRecordingPermissionsAsync()
  if (!granted) return null
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
  const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY)
  await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY)
  recorder.record()
  return recorder
}

export async function fermaRegistrazioneAudio(recording: AudioRecorder): Promise<string | null> {
  await recording.stop()
  return recording.uri
}
