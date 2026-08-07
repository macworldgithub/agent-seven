import { google } from 'googleapis';

export async function gmailListThreads(accessToken: string, input: { maxResults?: number, query?: string }): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.threads.list({
    userId: 'me',
    maxResults: input.maxResults || 10,
    q: input.query
  });

  const threads = res.data.threads || [];
  const result = [];
  
  for (const t of threads) {
    const threadDetails = await gmail.users.threads.get({ userId: 'me', id: t.id! });
    const messages = threadDetails.data.messages || [];
    const lastMessage = messages[messages.length - 1];
    const headers = lastMessage?.payload?.headers || [];
    
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    
    result.push({
      threadId: t.id,
      subject,
      from,
      date,
      snippet: t.snippet,
      unread: messages.some(m => m.labelIds?.includes('UNREAD'))
    });
  }
  return result;
}

export async function gmailGetThread(accessToken: string, input: { threadId: string }): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.threads.get({ userId: 'me', id: input.threadId, format: 'full' });
  
  const extractBody = (payload: any): string => {
    if (!payload) return '';
    let bodyData = '';
    
    const parts = payload.parts || [];
    const getPartData = (p: any, mimeType: string) => p.mimeType === mimeType ? p.body?.data : '';

    let textPart = parts.find((p: any) => p.mimeType === 'text/plain');
    let htmlPart = parts.find((p: any) => p.mimeType === 'text/html');

    if (!textPart && !htmlPart && payload.body?.data) {
       bodyData = payload.body.data;
    } else {
       if (textPart && textPart.body?.data) bodyData = textPart.body.data;
       else if (htmlPart && htmlPart.body?.data) {
           bodyData = htmlPart.body.data;
           const decodedHtml = Buffer.from(bodyData, 'base64').toString('utf-8');
           return decodedHtml.replace(/<[^>]*>?/gm, ''); // strip HTML
       }
    }

    if (bodyData) {
      return Buffer.from(bodyData, 'base64').toString('utf-8');
    }
    return '';
  };

  const messages = (res.data.messages || []).map(m => {
    const headers = m.payload?.headers || [];
    return {
      messageId: m.id,
      from: headers.find(h => h.name === 'From')?.value || '',
      to: headers.find(h => h.name === 'To')?.value || '',
      date: headers.find(h => h.name === 'Date')?.value || '',
      body: extractBody(m.payload)
    };
  });
  
  const threadSubject = messages.length > 0 ? (res.data.messages![0].payload?.headers?.find(h => h.name === 'Subject')?.value || '') : '';

  return {
    threadId: res.data.id,
    subject: threadSubject,
    messages
  };
}

export async function gmailDraftReply(accessToken: string, input: { threadId?: string, to?: string, subject?: string, body: string }): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth });

  let to = input.to || '';
  let subject = input.subject || '';
  let messageId = '';
  let references = '';

  if (input.threadId) {
    const thread = await gmail.users.threads.get({ userId: 'me', id: input.threadId, format: 'metadata' });
    const lastMessage = thread.data.messages?.[thread.data.messages.length - 1];
    const headers = lastMessage?.payload?.headers || [];
    
    if (!to) {
      to = headers.find(h => h.name === 'From')?.value || headers.find(h => h.name === 'Reply-To')?.value || '';
    }
    if (!subject) {
      let subj = headers.find(h => h.name === 'Subject')?.value || '';
      if (!subj.toLowerCase().startsWith('re:')) {
        subj = 'Re: ' + subj;
      }
      subject = subj;
    }
    messageId = headers.find(h => h.name === 'Message-ID')?.value || '';
    references = headers.find(h => h.name === 'References')?.value || messageId;
  }

  const rawMessageLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
  ];

  if (messageId) {
    rawMessageLines.push(`In-Reply-To: ${messageId}`);
    rawMessageLines.push(`References: ${references}`);
  }
  
  rawMessageLines.push('', input.body);

  const rawMessage = rawMessageLines.join('\r\n');
  const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const requestBody: any = {
    message: {
      raw: encodedMessage
    }
  };

  if (input.threadId) {
    requestBody.message.threadId = input.threadId;
  }

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody
  });

  return {
    draftId: res.data.id,
    subject,
    to,
    body: input.body
  };
}

export async function gmailSendWithApproval(accessToken: string, input: { threadId?: string, to?: string, subject?: string, body: string, requiresApproval: boolean }): Promise<any> {
  if (input.requiresApproval) {
    const draft = await gmailDraftReply(accessToken, { threadId: input.threadId, to: input.to, subject: input.subject, body: input.body });
    return { status: 'draft_created', draftId: draft.draftId, message: 'Draft created and awaiting approval' };
  } else {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    let to = input.to || '';
    let subject = input.subject || '';
    let messageId = '';
    let references = '';

    if (input.threadId) {
      const thread = await gmail.users.threads.get({ userId: 'me', id: input.threadId, format: 'metadata' });
      const lastMessage = thread.data.messages?.[thread.data.messages.length - 1];
      const headers = lastMessage?.payload?.headers || [];
      
      if (!to) {
        to = headers.find(h => h.name === 'From')?.value || headers.find(h => h.name === 'Reply-To')?.value || '';
      }
      if (!subject) {
        let subj = headers.find(h => h.name === 'Subject')?.value || '';
        if (!subj.toLowerCase().startsWith('re:')) {
          subj = 'Re: ' + subj;
        }
        subject = subj;
      }
      messageId = headers.find(h => h.name === 'Message-ID')?.value || '';
      references = headers.find(h => h.name === 'References')?.value || messageId;
    }

    const rawMessageLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
    ];

    if (messageId) {
      rawMessageLines.push(`In-Reply-To: ${messageId}`);
      rawMessageLines.push(`References: ${references}`);
    }
    
    rawMessageLines.push('', input.body);

    const rawMessage = rawMessageLines.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const requestBody: any = {
      raw: encodedMessage
    };

    if (input.threadId) {
      requestBody.threadId = input.threadId;
    }

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody
    });

    return { status: 'sent', messageId: res.data.id };
  }
}
