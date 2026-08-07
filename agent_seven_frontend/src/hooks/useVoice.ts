import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useVoiceRecognition – uses the browser's built-in Web Speech API (SpeechRecognition)
 * for transcription. No third-party STT API key required.
 * Supported in Chrome, Edge, and most Chromium-based browsers.
 */
export function useVoiceRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startRecording = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        const msg = 'Speech recognition is not supported in this browser. Please use Chrome or Edge.';
        setError(msg);
        reject(new Error(msg));
        return;
      }

      setError(null);
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        setIsProcessing(true);
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        const msg = event.error === 'not-allowed'
          ? 'Microphone permission denied. Please allow microphone access.'
          : `Speech recognition error: ${event.error}`;
        setError(msg);
        reject(new Error(msg));
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    });
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isRecording,
    isProcessing,
    setIsProcessing,
    error,
    startRecording,
    stopRecording,
    isSupported,
  };
}

// Keep old hook name as alias for backwards compatibility
export const useVoiceRecorder = useVoiceRecognition;


export function useVoicePlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);

  const playAudio = useCallback(async (audioBuffer: ArrayBuffer) => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const decodedData = await audioContext.current.decodeAudioData(audioBuffer);
      sourceNode.current = audioContext.current.createBufferSource();
      sourceNode.current.buffer = decodedData;
      sourceNode.current.connect(audioContext.current.destination);
      
      sourceNode.current.onended = () => {
        setIsPlaying(false);
      };

      sourceNode.current.start(0);
      setIsPlaying(true);
    } catch (err) {
      console.error('Error playing audio:', err);
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (sourceNode.current && isPlaying) {
      sourceNode.current.stop();
      sourceNode.current.disconnect();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  return {
    playAudio,
    isPlaying,
    stop
  };
}
