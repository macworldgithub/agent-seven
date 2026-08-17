import OpenAI from 'openai';
import axios from 'axios';
import { logger } from '../utils/logger';

// Lazy initialization — avoids crashing at import time if key is not yet set
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Download an image from a URL and convert it to base64.
 * If an accessToken is provided it is sent as a Bearer token (required for Slack & Drive private URLs).
 */
export async function imageUrlToBase64(
  url: string,
  accessToken?: string
): Promise<{ base64: string; mimeType: string }> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers,
    timeout: 30_000,
  });

  const buffer = Buffer.from(response.data as ArrayBuffer);
  const base64 = buffer.toString('base64');

  // Detect mimeType from Content-Type header or fall back to URL extension
  let mimeType: string = (response.headers['content-type'] as string | undefined) || '';
  mimeType = mimeType.split(';')[0].trim();

  if (!mimeType || mimeType === 'application/octet-stream') {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
    };
    mimeType = (ext && extMap[ext]) || 'image/jpeg';
  }

  return { base64, mimeType };
}

// ─── Core Vision Call ─────────────────────────────────────────────────────────

async function callVision(base64: string, mimeType: string, systemContent: string, userText: string): Promise<string> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      {
        role: 'system',
        content: systemContent,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
  });

  return response.choices[0].message.content ?? '';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze an image from a public or private URL.
 * Pass an accessToken when the URL is a private resource (e.g. Slack, Drive).
 */
export async function analyzeImageFromUrl(
  imageUrl: string,
  question: string,
  context?: string,
  accessToken?: string
): Promise<string> {
  try {
    const { base64, mimeType } = await imageUrlToBase64(imageUrl, accessToken);
    return analyzeImageFromBase64(base64, mimeType, question, context);
  } catch (err: any) {
    logger.error(`Vision: failed to download image from ${imageUrl}: ${err.message}`);
    throw err;
  }
}

/**
 * Analyze an image supplied as base64 data.
 */
export async function analyzeImageFromBase64(
  base64: string,
  mimeType: string,
  question: string,
  context?: string
): Promise<string> {
  const systemContent = `You are an expert image analyst with deep expertise in reading documents, charts, whiteboards, screenshots, and photographs. ${context ? `Context: ${context}` : ''}

Provide clear, structured, and actionable analysis. If asked to extract text, preserve formatting and line breaks. If asked about charts, describe trends and data points. If asked about whiteboards, extract all written content and structure it clearly.`;

  return callVision(base64, mimeType, systemContent, question);
}

/**
 * Extract all text from an image using OCR-style prompting.
 */
export async function extractTextFromImage(
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const systemContent = `You are an expert OCR (Optical Character Recognition) system. Extract all text exactly as it appears in the image, preserving formatting, line breaks, spacing, and structure. Do not paraphrase or summarize — return the raw text content.`;

  const userText = `Extract all text from this image exactly as it appears. Preserve formatting, line breaks, tables, bullet points, and document structure. If there are multiple columns or sections, clearly separate them.`;

  return callVision(imageBase64, mimeType, systemContent, userText);
}

/**
 * Analyze a whiteboard image and extract structured content.
 */
export async function analyzeWhiteboard(
  imageBase64: string,
  mimeType: string
): Promise<{ text: string; actionItems: string[]; decisions: string[]; diagrams: string }> {
  const systemContent = `You are an expert at analyzing whiteboard photos from meetings and workshops. Extract all information accurately and structure it clearly.`;

  const userText = `Analyze this whiteboard image and return a JSON object with exactly these fields:
{
  "text": "all text written on the whiteboard, preserving structure",
  "actionItems": ["array of action items with owners if visible"],
  "decisions": ["array of decisions made"],
  "diagrams": "description of any diagrams, flowcharts, arrows, or drawings"
}

Return only valid JSON, no markdown code blocks.`;

  const raw = await callVision(imageBase64, mimeType, systemContent, userText);

  try {
    // Strip possible markdown fences
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Fall back to a best-effort structure if JSON parse fails
    return {
      text: raw,
      actionItems: [],
      decisions: [],
      diagrams: '',
    };
  }
}

/**
 * Analyze a chart or graph and describe the data and trends.
 */
export async function analyzeChart(
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const systemContent = `You are a data analyst expert at interpreting charts, graphs, and data visualizations of all types (bar, line, pie, scatter, heatmap, etc.).`;

  const userText = `Analyze this chart or graph. Describe:
1. Chart type and title (if visible)
2. Axes labels and scales
3. Key data points and values
4. Trends, patterns, or anomalies
5. The main insight or takeaway from this visualization`;

  return callVision(imageBase64, mimeType, systemContent, userText);
}

/**
 * Generate a general accessibility description of an image.
 */
export async function describeImage(
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const systemContent = `You are an expert at describing images clearly and completely for people who cannot see them. Provide rich, accurate descriptions.`;

  const userText = `Describe this image in detail. Include:
- What is shown (people, objects, scene, setting)
- Colors, textures, and visual style
- Any text visible in the image
- The overall mood or purpose of the image
- Any notable details`;

  return callVision(imageBase64, mimeType, systemContent, userText);
}
