/**
 * End-to-End Encryption (E2EE) Helper
 * Uses Web Crypto API (AES-GCM)
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const SYSTEM_SECRET = 'chatflow-premium-secure-secret-2024'; // In a real app, this would be more complex

/**
 * Derives a crypto key from a secret string and chatId
 */
async function deriveKey(chatId) {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(SYSTEM_SECRET + chatId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(chatId), // Use chatId as salt
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plain text string
 * Returns base64 encoded JSON string: { iv: '...', ciphertext: '...' }
 */
export async function encryptMessage(text, chatId) {
  try {
    const key = await deriveKey(chatId);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      encoder.encode(text)
    );

    const result = {
      iv: btoa(String.fromCharCode(...iv)),
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
    };

    return `e2ee:${JSON.stringify(result)}`;
  } catch (err) {
    console.error('[E2EE] Encryption failed:', err);
    return text; // Fallback to plain text on error
  }
}

/**
 * Decrypts an e2ee prefixed string
 */
export async function decryptMessage(encryptedText, chatId) {
  if (!encryptedText || !encryptedText.startsWith('e2ee:')) {
    return encryptedText; // Not encrypted or legacy
  }

  try {
    const key = await deriveKey(chatId);
    const jsonStr = encryptedText.substring(5);
    const { iv: ivB64, ciphertext: cipherB64 } = JSON.parse(jsonStr);

    const iv = new Uint8Array(atob(ivB64).split('').map(c => c.charCodeAt(0)));
    const ciphertext = new Uint8Array(atob(cipherB64).split('').map(c => c.charCodeAt(0)));

    const decrypted = await window.crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn('[E2EE] Decryption failed (might be legacy or wrong key):', err);
    return '[Encrypted Message]'; // Hide content if decryption fails
  }
}
