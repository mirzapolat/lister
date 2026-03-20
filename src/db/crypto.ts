// ── Lister File Encryption ────────────────────────────────────────────────────
//
// Encrypted file format:
//   Bytes 0–6:   Magic "LISTER1" (7 bytes)
//   Byte  7:     Method — 0x01 = password, 0x02 = passkey
//   Bytes 8–23:  Salt (16 bytes) — PBKDF2 salt for password; zero bytes for passkey
//   Bytes 24–35: IV (12 bytes)  — AES-GCM nonce (always random)
//   Bytes 36+:   AES-GCM ciphertext
//
// Passkey credential IDs are stored in a separate IndexedDB ("lister-passkeys")
// keyed by file name so the right credential can be pre-selected on open.

const MAGIC = new Uint8Array([0x4c, 0x49, 0x53, 0x54, 0x45, 0x52, 0x31]); // "LISTER1"
const SALT_LEN = 16;
const IV_LEN = 12;
export const HEADER_LEN = MAGIC.length + 1 + SALT_LEN + IV_LEN; // 36 bytes

// Fixed PRF input — all passkeys for Lister use this same label so the same
// passkey always produces the same encryption key for a given credential.
const PRF_INPUT: ArrayBuffer = new TextEncoder().encode('lister-db-v1').buffer as ArrayBuffer;

export type EncryptionMethod = 'password' | 'passkey';

export interface EncryptionHeader {
  method: EncryptionMethod;
  salt: Uint8Array; // meaningful only for password method
}

// ── Header read/write ─────────────────────────────────────────────────────────

export function isEncryptedFile(bytes: Uint8Array): boolean {
  if (bytes.length < HEADER_LEN) return false;
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) return false;
  }
  return true;
}

export function readEncryptionHeader(bytes: Uint8Array): EncryptionHeader {
  const methodByte = bytes[MAGIC.length];
  const method: EncryptionMethod = methodByte === 0x02 ? 'passkey' : 'password';
  const salt = bytes.slice(MAGIC.length + 1, MAGIC.length + 1 + SALT_LEN);
  return { method, salt };
}

// ── Key derivation ────────────────────────────────────────────────────────────

// Helper: allocate a Uint8Array backed by a plain ArrayBuffer (not SharedArrayBuffer).
// crypto.subtle APIs require ArrayBuffer-backed views.
function newBytes(n: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(n));
}

export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  // Ensure salt is backed by a plain ArrayBuffer for subtle API compatibility.
  const saltBuf = newBytes(salt.length);
  saltBuf.set(salt);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuf, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function rawBytesToKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

export async function encryptBytes(
  plaintext: Uint8Array,
  key: CryptoKey,
  method: EncryptionMethod,
  existingSalt?: Uint8Array,
): Promise<Uint8Array<ArrayBuffer>> {
  // For password: reuse the existing salt so the same password keeps working.
  // For passkey:  salt field is unused — always zero bytes.
  const salt = newBytes(SALT_LEN);
  if (method === 'password' && existingSalt) salt.set(existingSalt);
  else if (method === 'password') crypto.getRandomValues(salt);

  const iv = newBytes(IV_LEN);
  crypto.getRandomValues(iv);

  // plaintext may come from sql.js which may use a SharedArrayBuffer-backed
  // Uint8Array; copy it to ensure we pass a plain ArrayBuffer to subtle.
  const plaintextBuf = newBytes(plaintext.length);
  plaintextBuf.set(plaintext);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintextBuf);

  const result = new Uint8Array(new ArrayBuffer(HEADER_LEN + ciphertext.byteLength));
  result.set(MAGIC, 0);
  result[MAGIC.length] = method === 'passkey' ? 0x02 : 0x01;
  result.set(salt, MAGIC.length + 1);
  result.set(iv, MAGIC.length + 1 + SALT_LEN);
  result.set(new Uint8Array(ciphertext), HEADER_LEN);
  return result;
}

export async function decryptBytes(fileBytes: Uint8Array, key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const ivStart = MAGIC.length + 1 + SALT_LEN;
  const iv = newBytes(IV_LEN);
  iv.set(fileBytes.slice(ivStart, HEADER_LEN));

  const ctLen = fileBytes.length - HEADER_LEN;
  const ciphertext = newBytes(ctLen);
  ciphertext.set(fileBytes.slice(HEADER_LEN));

  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new Uint8Array(plaintext);
  } catch {
    throw new Error('Wrong password — or the file is corrupted.');
  }
}

// ── Passkey / WebAuthn PRF ────────────────────────────────────────────────────

export function isPasskeySupported(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window;
}

export async function createPasskeyCredential(
  fileName: string,
): Promise<{ credentialId: Uint8Array; key: CryptoKey }> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Lister', id: window.location.hostname },
      user: { id: userId, name: fileName, displayName: fileName },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 },  // RS256
      ],
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      extensions: { prf: { eval: { first: PRF_INPUT } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error('Passkey creation was cancelled.');

  const ext = credential.getClientExtensionResults() as {
    prf?: { results?: { first?: ArrayBuffer } };
  };

  if (!ext.prf?.results?.first) {
    throw new Error(
      'Your browser or authenticator does not support the PRF extension required for passkey encryption. ' +
      'This feature works in Chrome with Touch ID, Windows Hello, or a compatible hardware security key.',
    );
  }

  const key = await rawBytesToKey(ext.prf.results.first);
  return { credentialId: new Uint8Array(credential.rawId), key };
}

export async function authenticateWithPasskey(credentialId?: Uint8Array): Promise<CryptoKey> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  let allowCredentials: PublicKeyCredentialDescriptor[] = [];
  if (credentialId) {
    const id = newBytes(credentialId.length);
    id.set(credentialId);
    allowCredentials = [{ type: 'public-key', id }];
  }

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials,
      userVerification: 'preferred',
      extensions: { prf: { eval: { first: PRF_INPUT } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error('Passkey authentication was cancelled.');

  const ext = assertion.getClientExtensionResults() as {
    prf?: { results?: { first?: ArrayBuffer } };
  };

  if (!ext.prf?.results?.first) {
    throw new Error(
      'Passkey authentication did not return an encryption key. ' +
      'Your browser may not support the PRF extension.',
    );
  }

  return rawBytesToKey(ext.prf.results.first);
}

// ── Passkey credential ID storage (IndexedDB "lister-passkeys") ───────────────

function openPasskeyIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('lister-passkeys', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('creds');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storePasskeyCredentialId(fileName: string, credentialId: Uint8Array): Promise<void> {
  try {
    const idb = await openPasskeyIDB();
    const tx = idb.transaction('creds', 'readwrite');
    tx.objectStore('creds').put(credentialId, fileName);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => { idb.close(); res(); };
      tx.onerror = () => { idb.close(); rej(tx.error); };
    });
  } catch { /* ignore */ }
}

export async function getPasskeyCredentialId(fileName: string): Promise<Uint8Array | null> {
  try {
    const idb = await openPasskeyIDB();
    const tx = idb.transaction('creds', 'readonly');
    const req = tx.objectStore('creds').get(fileName);
    return await new Promise<Uint8Array | null>((res) => {
      req.onsuccess = () => { idb.close(); res(req.result ?? null); };
      req.onerror = () => { idb.close(); res(null); };
    });
  } catch { return null; }
}

export async function clearPasskeyCredentialId(fileName: string): Promise<void> {
  try {
    const idb = await openPasskeyIDB();
    const tx = idb.transaction('creds', 'readwrite');
    tx.objectStore('creds').delete(fileName);
    await new Promise<void>((res) => {
      tx.oncomplete = () => { idb.close(); res(); };
      tx.onerror = () => { idb.close(); res(); };
    });
  } catch { /* ignore */ }
}
