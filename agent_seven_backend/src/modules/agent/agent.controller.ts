import { Request, Response } from 'express';
import { agentService } from './agent.service';
import { logger } from '../../utils/logger';
import { analyzeImageFromBase64 } from '../../services/vision.service';

export const agentController = {
  async getOrCreateAgent(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const agent = await agentService.getOrCreateAgent(tenantId);
      res.json({ success: true, data: agent });
    } catch (err: any) {
      logger.error('Error in getOrCreateAgent: ' + err.message);
      res.status(500).json({ error: err.message });
    }
  },

  async updateAgentConfig(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const agent = await agentService.updateAgentConfig(tenantId, req.body);
      res.json({ success: true, data: agent });
    } catch (err: any) {
      logger.error('Error in updateAgentConfig: ' + err.message);
      res.status(500).json({ error: err.message });
    }
  },

  async runAgentLoop(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const userId = (req as any).user.id;
      const { message, conversationId } = req.body;

      const isStream = req.path.endsWith('/stream');

      if (isStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        await agentService.runAgentLoop({
          tenantId,
          userId,
          conversationId: conversationId || null,
          userMessage: message,
          stream: true,
          onChunk: (chunk) => {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          }
        });

        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        const result = await agentService.runAgentLoop({
          tenantId,
          userId,
          conversationId: conversationId || null,
          userMessage: message,
          stream: false
        });
        res.json({ success: true, data: result });
      }
    } catch (err: any) {
      logger.error('Error in runAgentLoop: ' + err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    }
  },

  async getConversations(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const userId = (req as any).user.id;
      const convs = await agentService.getConversations(tenantId, userId);
      res.json({ success: true, data: convs });
    } catch (err: any) {
      logger.error('Error in getConversations: ' + err.message);
      res.status(500).json({ error: err.message });
    }
  },

  async getConversationMessages(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const id = req.params.id as string;
      const messages = await agentService.getConversationMessages(id, tenantId);
      res.json({ success: true, data: messages });
    } catch (err: any) {
      logger.error('Error in getConversationMessages: ' + err.message);
      res.status(500).json({ error: err.message });
    }
  },

  async deleteConversation(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const id = req.params.id as string;
      await agentService.deleteConversation(id, tenantId);
      res.status(204).send();
    } catch (err: any) {
      logger.error('Error in deleteConversation: ' + err.message);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * POST /api/agent/chat/vision
   * Accepts multipart/form-data with an optional image file.
   * Analyzes the image first, then passes the enriched context to the agent loop.
   */
  async chatWithVision(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const userId = (req as any).user.id;
      const { message, conversationId } = req.body;
      const imageFile = (req as any).file as Express.Multer.File | undefined;

      let fullMessage = message || 'Please analyze this image.';

      if (imageFile) {
        const base64 = imageFile.buffer.toString('base64');
        const mimeType = imageFile.mimetype;

        logger.info(`Vision chat: analyzing uploaded image (${mimeType}, ${imageFile.size} bytes)`);

        const imageAnalysis = await analyzeImageFromBase64(
          base64,
          mimeType,
          message || 'Describe this image in detail and highlight any important information.'
        );

        // Build an enriched message so the agent loop has full context
        fullMessage = message
          ? `${message}\n\n[Uploaded Image Analysis]:\n${imageAnalysis}`
          : `The user shared an image.\n\n[Image Analysis]:\n${imageAnalysis}`;
      }

      const result = await agentService.runAgentLoop({
        tenantId,
        userId,
        conversationId: conversationId || null,
        userMessage: fullMessage,
        stream: false,
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      logger.error('Error in chatWithVision: ' + err.message);
      res.status(500).json({ error: err.message });
    }
  }
};
