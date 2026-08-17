import { useState, useRef, useCallback } from 'react'

export const useCamera = () => {
  const [isActive, setIsActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsActive(true)
      setError(null)
    } catch (err: any) {
      setError(err.name === 'NotAllowedError'
        ? 'Camera permission denied.'
        : 'Could not access camera.'
      )
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setIsActive(false)
  }, [])

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current) return null
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(dataUrl)
    return dataUrl
  }, [])

  const switchCamera = useCallback(() => {
    stopCamera()
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }, [stopCamera])

  const clearCapture = useCallback(() => {
    setCapturedImage(null)
  }, [])

  return {
    videoRef,
    isActive,
    capturedImage,
    error,
    facingMode,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    clearCapture
  }
}
