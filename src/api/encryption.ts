/**
 * Application-level payload encryption (hybrid AES-GCM + RSA-OAEP).
 *
 * Flow (frontend side of the contract):
 *   1. Fetch the backend's RSA public key from GET /api/security/public-key (cached).
 *   2. Generate a fresh random AES-256-GCM key + nonce for every request.
 *   3. AES-GCM encrypt the JSON payload.
 *   4. Wrap the AES key with the backend RSA public key (RSA-OAEP / SHA-256).
 *   5. Send the envelope { encryptedKey, nonce, ciphertext, tag }.
 *
 * The backend unwraps the AES key with its RSA private key (which never leaves the
 * server) and decrypts the payload before model binding. Responses are NOT encrypted.
 *
 * Requires the Web Crypto API (secure context: https or localhost).
 */

export interface EncryptedEnvelope {
  encryptedKey: string;
  nonce: string;
  ciphertext: string;
  tag: string;
}

const PUBLIC_KEY_ENDPOINT = '/api/security/public-key';
const RSA_OAEP_PARAMS: RsaHashedImportParams = { name: 'RSA-OAEP', hash: 'SHA-256' };
const AES_KEY_LENGTH = 256;
const GCM_TAG_LENGTH = 16; // bytes — Web Crypto appends the tag to the ciphertext
const NONCE_LENGTH = 12; // bytes

let cachedPublicKey: CryptoKey | null = null;
let publicKeyFetchPromise: Promise<CryptoKey> | null = null;

/** True when the Web Crypto API is available in this context (secure context). */
export function isEncryptionAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto?.subtle;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  return fromBase64(base64).buffer as ArrayBuffer;
}

/**
 * Drop the cached public key so the next encrypted request refetches it.
 * Used as a safety net when the backend rejects a request because its key
 * pair was rotated (e.g. the keys-data volume was recreated).
 */
export function invalidatePublicKeyCache(): void {
  cachedPublicKey = null;
  publicKeyFetchPromise = null;
}

/** Fetch (and cache) the backend RSA public key as an importable CryptoKey. */
export async function getPublicKey(): Promise<CryptoKey> {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }

  if (!publicKeyFetchPromise) {
    publicKeyFetchPromise = (async () => {
      const response = await fetch(PUBLIC_KEY_ENDPOINT, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Failed to load server public key (HTTP ${response.status}).`);
      }

      const result = (await response.json()) as {
        success?: boolean;
        message?: string | null;
        data?: string | null;
      };

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Server did not return a public key.');
      }

      const key = await crypto.subtle.importKey(
        'spki',
        pemToArrayBuffer(result.data),
        RSA_OAEP_PARAMS,
        false,
        ['encrypt']
      );

      cachedPublicKey = key;
      return key;
    })().catch((err) => {
      // Allow a retry on the next call instead of caching the failure
      publicKeyFetchPromise = null;
      throw err;
    });
  }

  return publicKeyFetchPromise;
}

/**
 * Encrypt a JSON-serializable payload into the encrypted request envelope.
 * A fresh AES key + nonce are generated for every call (never reused).
 */
export async function encryptPayload(payload: unknown): Promise<EncryptedEnvelope> {
  if (!isEncryptionAvailable()) {
    throw new Error('Web Crypto API is not available in this context.');
  }

  const publicKey = await getPublicKey();

  // Fresh random AES-256-GCM key + nonce per request
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt']
  );
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));

  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  // AES-GCM encrypt — the returned buffer has the 16-byte auth tag appended
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext)
  );
  const ciphertext = encrypted.slice(0, encrypted.length - GCM_TAG_LENGTH);
  const tag = encrypted.slice(encrypted.length - GCM_TAG_LENGTH);

  // Wrap the raw AES key with the backend RSA public key (RSA-OAEP / SHA-256)
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const encryptedKey = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey)
  );

  return {
    encryptedKey: toBase64(encryptedKey),
    nonce: toBase64(nonce),
    ciphertext: toBase64(ciphertext),
    tag: toBase64(tag),
  };
}
