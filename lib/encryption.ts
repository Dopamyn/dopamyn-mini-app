import CryptoJS from 'crypto-js';

// The secret key - must match the backend exactly
// This should only be used on the server side
const secretKey = process.env.ENCRYPTION_KEY;

/**
 * Creates a compact hash-based token (6-20 characters) for Telegram URLs
 * This is a one-way hash, not reversible encryption
 * Perfect for short URLs and Telegram bot commands
 */
export function encryptHandleUrlSafe(text: string): string {
  if (!secretKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  try {
    // Create a hash with timestamp for uniqueness
    const timestamp = Date.now().toString();
    const combined = text + secretKey + timestamp;
    
    // Create SHA256 hash
    const hash = CryptoJS.SHA256(combined).toString();
    
    // Take first 12 characters and convert to base36 for compactness
    const shortHash = hash.substring(0, 12);
    const base36 = parseInt(shortHash, 16).toString(36);
    
    // Ensure it's between 6-20 characters
    const result = base36.substring(0, Math.min(20, Math.max(6, base36.length)));
    
    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt handle');
  }
}

/**
 * Alternative: Creates a reversible but very compact token using simple XOR
 * This produces 8-16 character results and is reversible
 */
export function encryptHandleCompact(text: string): string {
  if (!secretKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  try {
    // Simple XOR encryption with the secret key
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      const keyChar = secretKey.charCodeAt(i % secretKey.length);
      const textChar = text.charCodeAt(i);
      encrypted += String.fromCharCode(textChar ^ keyChar);
    }
    
    // Convert to base64url (URL-safe, no padding)
    const base64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encrypted));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt handle');
  }
}

/**
 * Decrypts the compact XOR encrypted text
 */
export function decryptHandleCompact(encryptedText: string): string {
  if (!secretKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  try {
    // Convert from base64url back to base64
    let base64 = encryptedText
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode from base64
    const encrypted = CryptoJS.enc.Base64.parse(base64).toString(CryptoJS.enc.Utf8);
    
    // XOR decrypt
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const keyChar = secretKey.charCodeAt(i % secretKey.length);
      const encryptedChar = encrypted.charCodeAt(i);
      decrypted += String.fromCharCode(encryptedChar ^ keyChar);
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt handle');
  }
}
