import React, { useState, useCallback, useEffect } from 'react';
import { useVoiceRecognition } from '../../hooks/useVoice';
import api from '../../lib/axios';

interface VoiceRecorderProps {
  conversationId?: string;
  onResponse: (transcription: string, response: string, audioUrl: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ conversationId, onResponse }) => {
  const {
    isRecording,
    isProcessing,
    setIsProcessing,
    error,
    startRecording,
    stopRecording,
    isSupported,
  } = useVoiceRecognition();

  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [responseText, setResponseText] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Cancel any ongoing speech when unmounting
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleMicClick = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    setTranscriptionText('');
    setResponseText('');
    setApiError(null);
    window.speechSynthesis?.cancel();

    try {
      // 1. Transcribe via browser Web Speech API
      const transcript = await startRecording();
      setTranscriptionText(transcript);

      // 2. Send to agent chat endpoint
      const res = await api.post('/agent/chat', {
        message: transcript,
        conversationId: conversationId || undefined,
      });

      const agentResponse: string = res.data?.data?.response ?? '';
      setResponseText(agentResponse);
      setIsProcessing(false);

      onResponse(transcript, agentResponse, '');

      // 3. Speak the response via browser TTS
      if (agentResponse) {
        speakText(agentResponse);
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.response?.data?.error || err.message || 'Error communicating with server');
      setIsProcessing(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-xl border border-slate-700/50 text-center">
        <div className="text-red-400 text-sm">
          ⚠️ Voice input is not supported in this browser.<br />
          Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-xl border border-slate-700/50">

      {(error || apiError) && (
        <div className="text-red-400 text-sm mb-4 text-center">
          {error || apiError}
        </div>
      )}

      <button
        onClick={handleMicClick}
        disabled={isProcessing}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
          isRecording
            ? 'bg-red-500/20 text-red-500 border-2 border-red-500'
            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-500/30'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {isRecording && (
          <div className="absolute inset-0 rounded-full animate-ping bg-red-500/30"></div>
        )}
        <div className="z-10 text-4xl">
          {isRecording ? '⏹' : '🎤'}
        </div>
      </button>

      <p className="mt-3 text-slate-400 text-xs">
        {isRecording ? 'Listening… click to stop' : 'Click to speak'}
      </p>

      <div className="mt-6 text-center min-h-[80px] max-w-md w-full">
        {isProcessing && (
          <div className="text-slate-400 animate-pulse">Processing…</div>
        )}

        {isSpeaking && !isProcessing && (
          <div className="text-indigo-400 flex items-center gap-2 justify-center mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></span>
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.1s' }}></span>
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            <span className="text-xs ml-1">Speaking…</span>
          </div>
        )}

        {transcriptionText && !isProcessing && (
          <div className="text-slate-300 text-sm mb-2 italic">
            "{transcriptionText}"
          </div>
        )}

        {responseText && !isProcessing && (
          <div className="text-slate-100 font-medium line-clamp-3">
            {responseText}
          </div>
        )}
      </div>

    </div>
  );
};
