import { encryptObject, decryptToObject } from './crypto';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_API_ENCRYPTION_KEY || '';

export async function fetchWithDecryption<T>(url: string, options: RequestInit = {}): Promise<T> {
  // 如果是 POST 请求且有 body，加密 body
  if (ENCRYPTION_KEY && options.method === 'POST' && options.body && typeof options.body === 'string') {
    try {
      const originalBody = JSON.parse(options.body);
      const encryptedData = await encryptObject(originalBody, ENCRYPTION_KEY);
      options.body = JSON.stringify({ encryptedData });
    } catch (e) {
      console.error('Failed to encrypt request body', e);
    }
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Request failed');
  }

  const data = await response.json();

  if (ENCRYPTION_KEY && data.encryptedData) {
    try {
      return await decryptToObject<T>(data.encryptedData, ENCRYPTION_KEY);
    } catch (e) {
      console.error('Failed to decrypt response body', e);
      throw new Error('Failed to decrypt response');
    }
  }

  return data as T;
}
