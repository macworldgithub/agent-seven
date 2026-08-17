import { useState, useRef, useCallback } from 'react'

type VoiceState = 'idle' | 'requesting' | 'listening' | 'processing' | 'speaking' | 'error'

export const useVoiceRecorder = () => {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcription, setTranscription] = useState('')
  const [agentResponse, setAgentResponse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(20).fill(0))
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const startVisualizer = (stream: MediaStream) => {
    const audioCtx = new window.AudioContext()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 64
    source.connect(analyser)
    analyserRef.current = analyser

    const updateLevels = () => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(dataArray)
      const levels = Array.from(dataArray.slice(0, 20)).map(v => v / 255)
      setAudioLevel(levels)
      animFrameRef.current = requestAnimationFrame(updateLevels)
    }
    updateLevels()
  }

  const stopVisualizer = () => {
    cancelAnimationFrame(animFrameRef.current)
    setAudioLevel(new Array(20).fill(0))
  }

  const startRecording = useCallback(async () => {
    try {
      setState('requesting')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start(100)
      setState('listening')
      startVisualizer(stream)
    } catch (err: any) {
      setState('error')
      setError(err.name === 'NotAllowedError' 
        ? 'Microphone permission denied. Please allow microphone access.'
        : 'Could not start recording. Please try again.'
      )
    }
  }, [])

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder) return

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType
        const blob = new Blob(chunksRef.current, { type: mimeType })
        resolve(blob)
      }

      mediaRecorder.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      stopVisualizer()
    })
  }, [])

  const sendVoiceMessage = useCallback(async (
    audioBlob: Blob,
    conversationId: string | null,
    accessToken: string
  ) => {
    setState('processing')
    
    try {
      const formData = new FormData()
      const extension = audioBlob.type.includes('webm') ? 'webm' : 'mp4'
      formData.append('file', audioBlob, `recording.${extension}`)
      if (conversationId) formData.append('conversationId', conversationId)

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/voice/message`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData
        }
      )

      const data = await response.json()
      
      if (!data.success) throw new Error(data.error)
      
      setTranscription(data.data.transcription)
      setAgentResponse(data.data.response)
      
      // Play audio response
      setState('speaking')
      if (data.data.audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.data.audioBase64}`)
        audio.onended = () => setState('idle')
        audio.onerror = () => setState('idle')
        await audio.play()
      } else {
        setState('idle')
      }

      return data.data
    } catch (err: any) {
      setState('error')
      setError(err.message || 'Something went wrong. Please try again.')
      setTimeout(() => setState('idle'), 3000)
    }
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setTranscription('')
    setAgentResponse('')
    setError(null)
  }, [])

  return {
    state,
    transcription,
    agentResponse,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    sendVoiceMessage,
    reset
  }
}
