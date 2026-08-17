import { google } from 'googleapis';
import { Readable } from 'stream';
import { analyzeImageFromBase64, extractTextFromImage, analyzeWhiteboard } from '../vision.service';

// ─── Client helpers ────────────────────────────────────────────────────────────

const getDriveClient = (accessToken: string) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
};

const getDocsClient = (accessToken: string) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.docs({ version: 'v1', auth });
};

// ─── DRIVE TOOLS ──────────────────────────────────────────────────────────────

/**
 * List files with optional folder and mimeType filters.
 */
export async function driveListFiles(
  accessToken: string,
  input: { query?: string; maxResults?: number; folderId?: string; mimeType?: string }
): Promise<any> {
  const drive = getDriveClient(accessToken);

  const queryParts: string[] = ['trashed = false'];

  if (input.folderId) {
    queryParts.push(`'${input.folderId}' in parents`);
  }

  if (input.mimeType) {
    queryParts.push(`mimeType = '${input.mimeType}'`);
  }

  if (input.query) {
    queryParts.push(`name contains '${input.query.replace(/'/g, "\\'")}'`);
  }

  const q = queryParts.join(' and ');

  const res = await drive.files.list({
    q,
    pageSize: input.maxResults || 30,
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink, parents)',
    orderBy: 'modifiedTime desc',
  });

  const files = (res.data.files || []).map((f) => ({
    fileId: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    size: f.size,
    webViewLink: f.webViewLink,
    iconLink: f.iconLink,
    parents: f.parents,
  }));

  return files;
}

/**
 * Get file metadata; optionally export content.
 */
export async function driveGetFile(
  accessToken: string,
  input: { fileId: string; includeContent?: boolean }
): Promise<any> {
  const drive = getDriveClient(accessToken);

  const metadata = await drive.files.get({
    fileId: input.fileId,
    fields: 'id, name, mimeType, webViewLink, size, modifiedTime',
  });

  const file = metadata.data;
  let content: string | undefined;

  if (input.includeContent) {
    try {
      if (file.mimeType?.includes('google-apps.document')) {
        const res = await drive.files.export(
          { fileId: input.fileId, mimeType: 'text/plain' },
          { responseType: 'text' }
        );
        content = res.data as string;
      } else if (file.mimeType?.includes('google-apps.spreadsheet')) {
        const res = await drive.files.export(
          { fileId: input.fileId, mimeType: 'text/csv' },
          { responseType: 'text' }
        );
        content = res.data as string;
      } else if (file.mimeType?.includes('google-apps.presentation')) {
        const res = await drive.files.export(
          { fileId: input.fileId, mimeType: 'text/plain' },
          { responseType: 'text' }
        );
        content = res.data as string;
      } else if (file.mimeType === 'application/pdf' || file.mimeType?.startsWith('text/')) {
        const res = await drive.files.get(
          { fileId: input.fileId, alt: 'media' },
          { responseType: 'text' }
        );
        content = res.data as string;
      }
    } catch (err) {
      console.error(`Error fetching file content for ${input.fileId}:`, err);
    }
  }

  return {
    fileId: file.id,
    name: file.name,
    mimeType: file.mimeType,
    content,
    webViewLink: file.webViewLink,
    size: file.size,
    modifiedTime: file.modifiedTime,
  };
}

/**
 * Create a new folder in Drive.
 */
export async function driveCreateFolder(
  accessToken: string,
  input: { name: string; parentFolderId?: string }
): Promise<any> {
  const drive = getDriveClient(accessToken);

  const res = await drive.files.create({
    requestBody: {
      name: input.name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: input.parentFolderId ? [input.parentFolderId] : undefined,
    },
    fields: 'id, name, webViewLink',
  });

  return {
    folderId: res.data.id,
    name: res.data.name,
    webViewLink: res.data.webViewLink,
  };
}

/**
 * Upload a text/markdown file to Drive.
 */
export async function driveUploadFile(
  accessToken: string,
  input: { name: string; content: string; mimeType: string; parentFolderId?: string }
): Promise<any> {
  const drive = getDriveClient(accessToken);

  const media = {
    mimeType: input.mimeType || 'text/plain',
    body: Readable.from([input.content]),
  };

  const res = await drive.files.create({
    requestBody: {
      name: input.name,
      parents: input.parentFolderId ? [input.parentFolderId] : undefined,
    },
    media,
    fields: 'id, name, webViewLink',
  });

  return {
    fileId: res.data.id,
    name: res.data.name,
    webViewLink: res.data.webViewLink,
  };
}

/**
 * Full-text search across Drive.
 */
export async function driveSearchFiles(
  accessToken: string,
  input: { query: string; maxResults?: number }
): Promise<any> {
  const drive = getDriveClient(accessToken);

  const safeQuery = input.query.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `fullText contains '${safeQuery}' and trashed = false`,
    pageSize: input.maxResults || 20,
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink, parents)',
    orderBy: 'modifiedTime desc',
  });

  return (res.data.files || []).map((f) => ({
    fileId: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    size: f.size,
    webViewLink: f.webViewLink,
    iconLink: f.iconLink,
    parents: f.parents,
  }));
}

// ─── DOCS TOOLS ───────────────────────────────────────────────────────────────

/**
 * Parse a simple markdown-like string into Google Docs API requests.
 */
function parseMarkdownToDocRequests(content: string): { insertText?: any; updateParagraphStyle?: any; updateTextStyle?: any }[] {
  const requests: any[] = [];
  const lines = content.split('\n');
  let currentIndex = 1; // Docs body starts at index 1

  for (const line of lines) {
    let text = line;
    let style = 'NORMAL_TEXT';

    if (line.startsWith('# ')) {
      text = line.slice(2);
      style = 'HEADING_1';
    } else if (line.startsWith('## ')) {
      text = line.slice(3);
      style = 'HEADING_2';
    } else if (line.startsWith('### ')) {
      text = line.slice(4);
      style = 'HEADING_3';
    }

    const lineText = text + '\n';

    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: lineText,
      },
    });

    if (style !== 'NORMAL_TEXT') {
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + lineText.length,
          },
          paragraphStyle: { namedStyleType: style },
          fields: 'namedStyleType',
        },
      });
    }

    // Handle bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      requests.push({
        createParagraphBullets: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + lineText.length,
          },
          bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
        },
      });
    }

    currentIndex += lineText.length;
  }

  return requests;
}

/**
 * Create a new Google Doc with markdown-parsed content.
 */
export async function docsCreateDocument(
  accessToken: string,
  input: { title: string; content: string }
): Promise<any> {
  const docs = getDocsClient(accessToken);

  // Create blank document
  const docRes = await docs.documents.create({
    requestBody: { title: input.title },
  });

  const documentId = docRes.data.documentId!;

  // Insert content via batchUpdate
  const requests = parseMarkdownToDocRequests(input.content);

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  }

  return {
    documentId,
    title: input.title,
    webViewLink: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

/**
 * Get full document content as plain text.
 */
export async function docsGetDocument(
  accessToken: string,
  input: { documentId: string }
): Promise<any> {
  const docs = getDocsClient(accessToken);

  const res = await docs.documents.get({ documentId: input.documentId });
  const doc = res.data;

  // Extract plain text from document body
  let content = '';
  const body = doc.body?.content || [];

  for (const elem of body) {
    if (elem.paragraph) {
      for (const pe of elem.paragraph.elements || []) {
        if (pe.textRun?.content) {
          content += pe.textRun.content;
        }
      }
    } else if (elem.table) {
      for (const row of elem.table.tableRows || []) {
        for (const cell of row.tableCells || []) {
          for (const cellElem of cell.content || []) {
            if (cellElem.paragraph) {
              for (const pe of cellElem.paragraph.elements || []) {
                if (pe.textRun?.content) {
                  content += pe.textRun.content + '\t';
                }
              }
            }
          }
        }
        content += '\n';
      }
    }
  }

  return {
    documentId: doc.documentId,
    title: doc.title,
    content: content.trim(),
    webViewLink: `https://docs.google.com/document/d/${doc.documentId}/edit`,
  };
}

/**
 * Update an existing Google Doc — append or replace content.
 */
export async function docsUpdateDocument(
  accessToken: string,
  input: { documentId: string; content: string; append?: boolean }
): Promise<any> {
  const docs = getDocsClient(accessToken);

  const docRes = await docs.documents.get({ documentId: input.documentId });
  const doc = docRes.data;

  const requests: any[] = [];

  if (!input.append) {
    // Clear existing content (keep index 1 as minimum)
    const endIndex = doc.body?.content
      ? doc.body.content.reduce((max: number, el: any) => {
          if (el.endIndex) return Math.max(max, el.endIndex);
          return max;
        }, 1)
      : 1;

    if (endIndex > 2) {
      requests.push({
        deleteContentRange: {
          range: { startIndex: 1, endIndex: endIndex - 1 },
        },
      });
    }
  }

  // For append: insert at end of document
  let insertIndex = 1;
  if (input.append) {
    const endIndex = doc.body?.content
      ? doc.body.content.reduce((max: number, el: any) => {
          if (el.endIndex) return Math.max(max, el.endIndex);
          return max;
        }, 1)
      : 1;
    insertIndex = Math.max(1, endIndex - 1);
  }

  const newRequests = parseMarkdownToDocRequests(input.content);

  // Adjust indices for append
  if (input.append && insertIndex > 1) {
    for (const req of newRequests) {
      if (req.insertText) {
        req.insertText.location.index += insertIndex - 1;
      }
      if (req.updateParagraphStyle) {
        req.updateParagraphStyle.range.startIndex += insertIndex - 1;
        req.updateParagraphStyle.range.endIndex += insertIndex - 1;
      }
    }
  }

  const allRequests = [...requests, ...newRequests];

  if (allRequests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: input.documentId,
      requestBody: { requests: allRequests },
    });
  }

  return {
    documentId: input.documentId,
    title: doc.title,
    webViewLink: `https://docs.google.com/document/d/${input.documentId}/edit`,
  };
}

/**
 * Copy a template document and replace {{placeholder}} values.
 */
export async function docsCreateFromTemplate(
  accessToken: string,
  input: { templateId: string; title: string; replacements: Record<string, string> }
): Promise<any> {
  const drive = getDriveClient(accessToken);
  const docs = getDocsClient(accessToken);

  // Copy the template
  const copyRes = await drive.files.copy({
    fileId: input.templateId,
    requestBody: { name: input.title },
    fields: 'id, name',
  });

  const documentId = copyRes.data.id!;

  // Replace placeholders using batchUpdate replaceAllText
  const requests = Object.entries(input.replacements).map(([placeholder, value]) => ({
    replaceAllText: {
      containsText: {
        text: `{{${placeholder}}}`,
        matchCase: false,
      },
      replaceText: value,
    },
  }));

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  }

  return {
    documentId,
    title: input.title,
    webViewLink: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

// ─── BRANDED DOCUMENT GENERATOR ───────────────────────────────────────────────

type BrandedDocType = 'proposal' | 'invoice' | 'meeting_notes' | 'report' | 'sow';

/**
 * Generate a structured branded document in Google Drive.
 */
export async function generateBrandedDocument(
  accessToken: string,
  input: {
    type: BrandedDocType;
    title: string;
    data: Record<string, any>;
    brandConfig?: { companyName?: string; tagline?: string };
  }
): Promise<any> {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const companyName = input.brandConfig?.companyName || input.data.businessName || 'Your Company';

  let content = '';

  switch (input.type) {
    case 'proposal': {
      const d = input.data;
      const totalValue = d.totalValue
        ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(d.totalValue))
        : 'TBD';
      content = `# ${companyName}

# PROPOSAL: ${input.title}

Date: ${dateStr}
Prepared for: ${d.clientName || 'Client'}
Prepared by: ${companyName}

---

## Executive Summary

${d.executiveSummary || 'This proposal outlines our recommended approach and investment for your project.'}

---

## Scope of Work

${d.scopeOfWork || 'The following services will be delivered:'}

---

## Timeline

${d.timeline || 'Project timeline to be confirmed upon engagement.'}

---

## Investment

Total Project Value: ${totalValue}

Payment terms: 50% upfront, 50% on completion.

---

## Terms & Conditions

- This proposal is valid for 30 days from the date above.
- All prices are in Australian Dollars (AUD) and exclude GST unless stated.
- GST of 10% will be added to all invoices.
- Intellectual property transfers upon receipt of final payment.

---

## Next Steps

1. Review this proposal and provide feedback within 5 business days.
2. Sign the Statement of Work to commence the project.
3. Remit the initial 50% deposit to confirm your booking.

We look forward to working with you. Please contact us with any questions.

${companyName}`;
      break;
    }

    case 'invoice': {
      const d = input.data;
      const invoiceNumber = d.invoiceNumber || `INV-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}-001`;
      const dueDate = d.dueDate
        ? new Date(d.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

      // Calculate totals from line items
      const lineItems: Array<{ description: string; qty: number; rate: number }> = d.lineItems || [];
      const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
      const gst = subtotal * 0.1;
      const total = subtotal + gst;

      const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

      const lineItemsText = lineItems.length > 0
        ? lineItems.map(item =>
            `- ${item.description} | Qty: ${item.qty} | Rate: ${formatCurrency(item.rate)} | Amount: ${formatCurrency(item.qty * item.rate)}`
          ).join('\n')
        : '- Services rendered | Qty: 1 | Rate: $0.00 | Amount: $0.00';

      content = `# INVOICE

Invoice Number: ${invoiceNumber}
Date: ${dateStr}
Due Date: ${dueDate}

---

## From

${companyName}
${d.businessAddress || 'Address: [Your Business Address]'}
ABN: ${d.abn || '[Your ABN]'}

## To

${d.clientName || 'Client'}
${d.clientAddress || ''}

---

## Line Items

${lineItemsText}

---

## Summary

Subtotal: ${formatCurrency(subtotal)}
GST (10%): ${formatCurrency(gst)}
**Total Due: ${formatCurrency(total)}**

---

## Payment Details

Bank: ${d.bankName || '[Bank Name]'}
BSB: ${d.bsb || '[BSB]'}
Account: ${d.accountNumber || '[Account Number]'}
Reference: ${invoiceNumber}

Payment Terms: ${d.paymentTerms || 'Net 30 days'}

Thank you for your business.`;
      break;
    }

    case 'meeting_notes': {
      const d = input.data;
      const attendees = Array.isArray(d.attendees) ? d.attendees.join(', ') : (d.attendees || '');
      const agendaItems = d.agendaItems || '';
      const discussionPoints = d.discussionPoints || '';
      const decisions = d.decisions || '';

      const actionItems: Array<{ task: string; owner: string; dueDate?: string }> = d.actionItems || [];
      const actionItemsText = actionItems.length > 0
        ? actionItems.map(a => `- [ ] ${a.task} — Owner: ${a.owner}${a.dueDate ? ` | Due: ${a.dueDate}` : ''}`).join('\n')
        : '';

      content = `# MEETING NOTES

## ${input.title}

Date: ${d.date || dateStr}
Attendees: ${attendees}
Facilitator: ${d.facilitator || ''}

---

## Agenda

${agendaItems}

---

## Discussion

${discussionPoints}

---

## Decisions Made

${decisions}

---

## Action Items

${actionItemsText}

---

## Next Meeting

${d.nextMeeting || 'TBD'}

---

*Notes prepared by ${companyName}*`;
      break;
    }

    case 'report': {
      const d = input.data;
      content = `# ${input.title}

Date: ${dateStr}
Prepared by: ${companyName}

---

## Executive Summary

${d.executiveSummary || ''}

---

## Key Findings

${d.keyFindings || ''}

---

## Analysis

${d.analysis || ''}

---

## Recommendations

${d.recommendations || ''}

---

## Appendix

${d.appendix || 'N/A'}

---

*Report prepared by ${companyName} — ${dateStr}*`;
      break;
    }

    case 'sow': {
      const d = input.data;
      content = `# STATEMENT OF WORK

## ${input.title}

Date: ${dateStr}
Client: ${d.clientName || ''}
Service Provider: ${companyName}

---

## Project Overview

${d.overview || ''}

---

## Deliverables

${d.deliverables || ''}

---

## Timeline & Milestones

${d.milestones || ''}

---

## Resources

${d.resources || ''}

---

## Assumptions & Exclusions

${d.assumptions || ''}

---

## Acceptance Criteria

${d.acceptanceCriteria || ''}

---

## Commercial Terms

${d.commercialTerms || `All prices in AUD excluding GST. GST of 10% will be added to all invoices. Payment terms: Net 30 days.`}

---

*This Statement of Work is legally binding once signed by both parties.*

Provider: ${companyName}     Client: ${d.clientName || '_________________'}`;
      break;
    }

    default:
      content = `# ${input.title}\n\n${JSON.stringify(input.data, null, 2)}`;
  }

  return docsCreateDocument(accessToken, { title: input.title, content });
}

// ─── DRIVE VISION TOOLS ───────────────────────────────────────────────────────

/**
 * List image files in Google Drive.
 */
export async function driveListImages(
  accessToken: string,
  input: { folderId?: string; maxResults?: number }
): Promise<any> {
  const drive = getDriveClient(accessToken);

  const queryParts: string[] = [
    "mimeType contains 'image/'",
    'trashed = false',
  ];
  if (input.folderId) {
    queryParts.push(`'${input.folderId}' in parents`);
  }

  const res = await drive.files.list({
    q: queryParts.join(' and '),
    pageSize: input.maxResults || 20,
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink, parents)',
    orderBy: 'modifiedTime desc',
  });

  return (res.data.files || []).map((f) => ({
    fileId: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    size: f.size,
    webViewLink: f.webViewLink,
  }));
}

/**
 * Download a Drive image and analyze it with GPT-4o vision.
 */
export async function driveAnalyzeImage(
  accessToken: string,
  input: { fileId: string; question: string }
): Promise<any> {
  const drive = getDriveClient(accessToken);

  // Get file metadata first to retrieve the mimeType
  const meta = await drive.files.get({
    fileId: input.fileId,
    fields: 'id, name, mimeType',
  });
  const fileName = meta.data.name || 'image';
  const mimeType = meta.data.mimeType || 'image/jpeg';

  // Download binary content
  const mediaRes = await drive.files.get(
    { fileId: input.fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  const buffer = Buffer.from(mediaRes.data as ArrayBuffer);
  const base64 = buffer.toString('base64');

  const analysis = await analyzeImageFromBase64(base64, mimeType, input.question);

  return { analysis, fileName, mimeType };
}

/**
 * Extract all text from a Drive image file (OCR).
 */
export async function driveExtractTextFromImage(
  accessToken: string,
  input: { fileId: string }
): Promise<any> {
  const drive = getDriveClient(accessToken);

  const meta = await drive.files.get({
    fileId: input.fileId,
    fields: 'id, name, mimeType',
  });
  const fileName = meta.data.name || 'image';
  const mimeType = meta.data.mimeType || 'image/jpeg';

  const mediaRes = await drive.files.get(
    { fileId: input.fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  const buffer = Buffer.from(mediaRes.data as ArrayBuffer);
  const base64 = buffer.toString('base64');

  const extractedText = await extractTextFromImage(base64, mimeType);

  return { extractedText, fileName, mimeType };
}

/**
 * Analyze a whiteboard photo from Google Drive.
 * Extracts text, action items, decisions, and describes diagrams.
 */
export async function driveAnalyzeWhiteboard(
  accessToken: string,
  input: { fileId: string }
): Promise<any> {
  const drive = getDriveClient(accessToken);

  const meta = await drive.files.get({
    fileId: input.fileId,
    fields: 'id, name, mimeType',
  });
  const fileName = meta.data.name || 'image';
  const mimeType = meta.data.mimeType || 'image/jpeg';

  const mediaRes = await drive.files.get(
    { fileId: input.fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  const buffer = Buffer.from(mediaRes.data as ArrayBuffer);
  const base64 = buffer.toString('base64');

  const whiteboardAnalysis = await analyzeWhiteboard(base64, mimeType);

  return { ...whiteboardAnalysis, fileName, mimeType };
}
