import { google } from 'googleapis';

export async function driveListFiles(accessToken: string, input: { query?: string, maxResults?: number }): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    q: input.query,
    pageSize: input.maxResults || 20,
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)'
  });

  return res.data.files || [];
}

export async function driveGetFile(accessToken: string, input: { fileId: string }): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth });

  const metadata = await drive.files.get({
    fileId: input.fileId,
    fields: 'id, name, mimeType, webViewLink'
  });

  const file = metadata.data;
  let content = undefined;

  try {
    if (file.mimeType?.includes('google-apps.document')) {
      const res = await drive.files.export({ fileId: input.fileId, mimeType: 'text/plain' });
      content = res.data;
    } else if (file.mimeType?.includes('google-apps.spreadsheet')) {
      const res = await drive.files.export({ fileId: input.fileId, mimeType: 'text/csv' });
      content = res.data;
    } else if (file.mimeType?.includes('google-apps.presentation')) {
      const res = await drive.files.export({ fileId: input.fileId, mimeType: 'text/plain' });
      content = res.data;
    } else if (file.mimeType === 'application/pdf' || file.mimeType?.startsWith('text/')) {
      const res = await drive.files.get({ fileId: input.fileId, alt: 'media' }, { responseType: 'text' });
      content = res.data;
    }
  } catch (err) {
    console.error(`Error fetching file content for ${input.fileId}:`, err);
    // Ignore content fetch errors and return metadata at least
  }

  return {
    fileId: file.id,
    name: file.name,
    mimeType: file.mimeType,
    content,
    webViewLink: file.webViewLink
  };
}
