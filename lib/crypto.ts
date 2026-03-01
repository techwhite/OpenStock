/**
 * 通用加密工具类
 * 使用 Web Crypto API，兼容浏览器和 Node.js (18+)
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;

// 从字符串派生密钥
async function deriveKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // 使用 SHA-256 哈希密码以获得固定长度的密钥数据
  const hash = await crypto.subtle.digest('SHA-256', passwordBuffer);
  
  return await crypto.subtle.importKey(
    'raw',
    hash,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密字符串
 */
export async function encryptData(text: string, keyStr: string): Promise<string> {
  if (!keyStr) return text;
  
  try {
    const key = await deriveKey(keyStr);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      data
    );
    
    // 合并 IV 和加密数据
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // 转换为 Base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
}

/**
 * 解密字符串
 */
export async function decryptData(base64Data: string, keyStr: string): Promise<string> {
  if (!keyStr || !base64Data) return base64Data;
  
  try {
    const key = await deriveKey(keyStr);
    const combined = new Uint8Array(
      atob(base64Data)
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return base64Data;
  }
}

/**
 * 加密对象
 */
export async function encryptObject(obj: any, keyStr: string): Promise<string> {
  return encryptData(JSON.stringify(obj), keyStr);
}

/**
 * 解密对象
 */
export async function decryptToObject<T>(base64Data: string, keyStr: string): Promise<T> {
  const decrypted = await decryptData(base64Data, keyStr);
  return JSON.parse(decrypted);
}
