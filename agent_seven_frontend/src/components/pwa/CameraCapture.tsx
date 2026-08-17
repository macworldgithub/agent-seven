import React, { useEffect, useState } from 'react';
import { X, RotateCcw, Image as ImageIcon, Send } from 'lucide-react';
import { useCamera } from '../../hooks/useCamera';

interface CameraCaptureProps {
  onCapture: (imageBase64: string, text?: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const {
    videoRef,
    isActive,
    capturedImage,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    clearCapture
  } = useCamera();

  const [textInput, setTextInput] = useState('');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    capturePhoto();
  };

  const handleSend = () => {
    if (capturedImage) {
      onCapture(capturedImage, textInput.trim() || undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-safe-top py-4 flex justify-between items-center absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="p-2 text-white">
          <X size={24} />
        </button>
        <span className="text-white font-medium text-sm">Camera</span>
        <button 
          onClick={switchCamera} 
          disabled={!!capturedImage}
          className={`p-2 text-white ${capturedImage ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <RotateCcw size={24} />
        </button>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {error ? (
          <div className="text-white text-center p-6">
            <p className="text-danger mb-2">Camera Error</p>
            <p className="text-sm text-muted">{error}</p>
          </div>
        ) : capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <video 
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Flash Effect */}
        {flash && <div className="absolute inset-0 bg-white z-20" />}
      </div>

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-md pb-safe-bottom">
        {capturedImage ? (
          <div className="p-4 flex flex-col gap-4">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Add a message (optional)..."
              className="w-full bg-white/10 text-white placeholder:text-white/50 border border-white/20 rounded-xl px-4 py-3 outline-none focus:border-brand"
            />
            <div className="flex justify-between items-center px-4">
              <button 
                onClick={clearCapture}
                className="text-white/80 hover:text-white py-2 px-4 font-medium"
              >
                Retake
              </button>
              <button 
                onClick={handleSend}
                className="bg-brand text-white flex items-center gap-2 py-2 px-6 rounded-full font-medium hover:bg-brand-hover active:scale-95 transition-transform"
              >
                <span>Send</span>
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-8 py-8 flex items-center justify-between">
            <button className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
              <ImageIcon size={24} />
            </button>
            
            <button 
              onClick={handleCapture}
              className="w-20 h-20 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-full h-full bg-white rounded-full" />
            </button>
            
            <div className="w-12 h-12" /> {/* Spacer */}
          </div>
        )}
      </div>
    </div>
  );
}
