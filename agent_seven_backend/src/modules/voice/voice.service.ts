import { Request, Response } from 'express';
import { elevenlabsService } from '../../services/elevenlabs.service';
import { agentService } from '../agent/agent.service';
import { incrementUsage } from '../billing/billing.service';
import { prisma } from '../../config/db';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const voiceService = {
  async processVoiceMessage(params: { tenantId: string, userId: string, audioBuffer: Buffer, mimeType: string, conversationId?: string }): Promise<{ transcription: string, response: string, audioUrl: string, conversationId: string }> {
    const { tenantId, userId, audioBuffer, mimeType, conversationId } = params;

    // 1. Transcribe audio
    const transcription = await elevenlabsService.transcribeAudio(audioBuffer, mimeType);

    // 2. Run through agent loop
    const agentResult = await agentService.runAgentLoop({
      tenantId,
      userId,
      conversationId: conversationId || null,
      userMessage: transcription,
      stream: false
    });

    // 3. Convert response to speech
    const ttsBuffer = await elevenlabsService.textToSpeech(agentResult.response);

    // 4. Save to local "object storage" (public/audio folder)
    const publicDir = path.join(process.cwd(), 'public/audio');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const fileName = `${crypto.randomUUID()}.mp3`;
    const filePath = path.join(publicDir, fileName);
    fs.writeFileSync(filePath, ttsBuffer);

    // 5. Log to AuditLog
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'voice.message',
        resourceType: 'Conversation',
        resourceId: agentResult.conversationId,
        metaJson: JSON.stringify({
          transcriptionLength: transcription.length,
          responseLength: agentResult.response.length
        })
      }
    });

    // Estimate voice minutes from audio duration
    const voiceMinutes = audioBuffer.length / (192000 * 8) / 60 // based on 192kbps

    await incrementUsage(tenantId, {
      toolCalls: 0,
      tokens: 0,
      voiceMinutes
    })

    // 6. Return
    return {
      transcription,
      response: agentResult.response,
      audioUrl: `/audio/${fileName}`,
      conversationId: agentResult.conversationId
    };
  },

  async getVoices(): Promise<any> {
    return elevenlabsService.getVoices();
  },

  async streamVoiceResponse(params: { tenantId: string, userId: string, text: string, res: Response }): Promise<void> {
    const { text, res } = params;
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    await elevenlabsService.streamTextToSpeech(text, (chunk) => {
      res.write(chunk);
    });
    
    res.end();
  }
};
