export const elevenlabsService = {
  async textToSpeech(text: string, voiceId: string = '21m00Tcm4TlvDq8ikWAM'): Promise<Buffer> {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  },

  async getVoices(): Promise<{ voiceId: string, name: string, preview_url: string }[]> {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      }
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs getVoices failed: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.voices.map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      preview_url: v.preview_url
    }));
  },

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const blob = new Blob([audioBuffer as any], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm'); // Ensure correct extension for multipart
    formData.append('model_id', 'scribe_v1');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
      body: formData as any
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ElevenLabs transcribe failed: ${response.statusText} - ${err}`);
    }

    const data: any = await response.json();
    return data.text;
  },

  async streamTextToSpeech(text: string, onChunk: (chunk: Buffer) => void, voiceId: string = '21m00Tcm4TlvDq8ikWAM'): Promise<void> {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS stream failed: ${response.statusText}`);
    }

    if (response.body) {
      for await (const chunk of response.body as any) {
        onChunk(Buffer.from(chunk));
      }
    }
  }
};
