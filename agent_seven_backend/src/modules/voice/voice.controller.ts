import { Request, Response } from 'express';
import { voiceService } from './voice.service';
import { elevenlabsService } from '../../services/elevenlabs.service';
import { llmService } from '../../services/llm.service';

export const voiceController = {
  async processVoiceMessage(req: Request, res: Response) {
    try {
      const { tenantId, id: userId } = req.user!;
      const { conversationId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, error: 'Audio file is required' });
      }

      const data = await voiceService.processVoiceMessage({
        tenantId,
        userId,
        audioBuffer: file.buffer,
        mimeType: file.mimetype,
        conversationId
      });

      res.json({ success: true, data });
    } catch (err: any) {
      console.error('Error in processVoiceMessage:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async streamVoiceResponse(req: Request, res: Response) {
    try {
      const { tenantId, id: userId } = req.user!;
      const { text, conversationId } = req.body;

      if (!text) {
        return res.status(400).json({ success: false, error: 'Text is required' });
      }

      await voiceService.streamVoiceResponse({ tenantId, userId, text, res });
    } catch (err: any) {
      console.error('Error in streamVoiceResponse:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message });
      } else {
        res.end();
      }
    }
  },

  async getVoices(req: Request, res: Response) {
    try {
      const voices = await voiceService.getVoices();
      res.json({ success: true, data: voices });
    } catch (err: any) {
      console.error('Error in getVoices:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async transcribe(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'Audio file is required' });
      }

      const transcription = await llmService.transcribeAudio(file.buffer, file.mimetype);
      res.json({ success: true, transcription });
    } catch (err: any) {
      console.error('Error in transcribe:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
