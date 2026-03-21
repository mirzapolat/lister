import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { SCHEMA_SQL, MIGRATION_SQL } from './schema';
import type { List, Contact, Campaign, SmtpSettings, ImportHistory, Bounce, Subscriber, SenderProfile, CampaignSend, EmailTheme, EmailTemplate } from '../types';
import { BUILTIN_THEMES } from '../themes/builtinThemes';
import { BUILTIN_TEMPLATES } from '../themes/builtinTemplates';
import {
  isEncryptedFile, readEncryptionHeader, encryptBytes, decryptBytes,
  EncryptionMethod, storePasskeyCredentialId, clearPasskeyCredentialId,
} from './crypto';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let fileHandle: FileSystemFileHandle | null = null;
let fallbackFileName = 'lister.sqlite';

// ── In-memory encryption state ────────────────────────────────────────────────
let encryptionKey: CryptoKey | null = null;
// For password method: the PBKDF2 salt stored in the file header (reused on save).
// For passkey method:  null (salt field in header is always zero bytes).
let encryptionSalt: Uint8Array | null = null;
let encryptionMethod: EncryptionMethod | null = null;

// ── Pending encrypted-file open ───────────────────────────────────────────────
// When an encrypted file is opened, we stash the raw bytes and handle here until
// the user provides the password/passkey and completePendingOpenWithKey() is called.
let pendingFileBytes: Uint8Array | null = null;
let pendingHandle: FileSystemFileHandle | null = null;
let pendingFileName: string | null = null;

// ── Open result type ──────────────────────────────────────────────────────────
export type OpenResult =
  | { status: 'ok'; db: Database; fileName: string }
  | { status: 'needs-auth'; method: EncryptionMethod; salt: Uint8Array; fileName: string };

// ── Encryption state queries ──────────────────────────────────────────────────
export function isEncrypted(): boolean { return encryptionKey !== null; }
export function getEncryptionMethod(): EncryptionMethod | null { return encryptionMethod; }

// ── IndexedDB helpers for persisting the file handle across reloads ──

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('lister-fsa', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeFileHandleInIDB(handle: FileSystemFileHandle): Promise<void> {
  try {
    const idb = await openIDB();
    const tx = idb.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'last');
    await new Promise<void>((res, rej) => { tx.oncomplete = () => { idb.close(); res(); }; tx.onerror = () => { idb.close(); rej(tx.error); }; });
  } catch { /* ignore */ }
}

export async function getStoredFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const idb = await openIDB();
    const tx = idb.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get('last');
    return await new Promise<FileSystemFileHandle | null>((res) => { req.onsuccess = () => { idb.close(); res(req.result ?? null); }; req.onerror = () => { idb.close(); res(null); }; });
  } catch { return null; }
}

export async function clearStoredFileHandle(): Promise<void> {
  try {
    const idb = await openIDB();
    const tx = idb.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete('last');
    await new Promise<void>((res) => { tx.oncomplete = () => { idb.close(); res(); }; tx.onerror = () => { idb.close(); res(); }; });
  } catch { /* ignore */ }
}

export function closeDatabase(): void {
  if (db) { db.close(); db = null; }
  fileHandle = null;
  encryptionKey = null;
  encryptionSalt = null;
  encryptionMethod = null;
  pendingFileBytes = null;
  pendingHandle = null;
  pendingFileName = null;
}

export function hasFileSystemApi(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

export function getFileName(): string {
  return fileHandle?.name ?? fallbackFileName;
}

export async function initSqlJs_(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });
  return SQL;
}

export async function createNewDatabase(): Promise<Database> {
  const sql = await initSqlJs_();
  db = new sql.Database();
  db.run(SCHEMA_SQL);
  db.run(MIGRATION_SQL);
  seedBuiltinThemes();
  seedBuiltinTemplates();
  return db;
}

// Private helper: run schema/migration/seed on an already-loaded db instance.
async function initializeLoadedDb(): Promise<void> {
  if (!db) throw new Error('No database loaded');
  db.run("PRAGMA foreign_keys = ON;");
  db.run(SCHEMA_SQL);
  // Back-fill columns that may be missing from older databases.
  const spCols = db.exec("SELECT name FROM pragma_table_info('sender_profiles')");
  const spColNames = spCols[0]?.values.map((r) => r[0]) ?? [];
  if (!spColNames.includes('rate_limit_ms')) {
    db.run('ALTER TABLE sender_profiles ADD COLUMN rate_limit_ms INTEGER NOT NULL DEFAULT 0');
  }
  const cCols = db.exec("SELECT name FROM pragma_table_info('campaigns')");
  const cColNames = cCols[0]?.values.map((r) => r[0]) ?? [];
  if (!cColNames.includes('sender_profile_id')) {
    db.run('ALTER TABLE campaigns ADD COLUMN sender_profile_id INTEGER');
  }
  if (!cColNames.includes('theme_id')) {
    db.run('ALTER TABLE campaigns ADD COLUMN theme_id INTEGER');
  }
  db.run(MIGRATION_SQL);
  seedBuiltinThemes();
  seedBuiltinTemplates();
}

export async function openDatabaseFromFile(handle: FileSystemFileHandle): Promise<OpenResult> {
  await initSqlJs_();
  const file = await handle.getFile();
  const rawBytes = new Uint8Array(await file.arrayBuffer());

  if (isEncryptedFile(rawBytes)) {
    const header = readEncryptionHeader(rawBytes);
    pendingFileBytes = rawBytes;
    pendingHandle = handle;
    pendingFileName = handle.name;
    return { status: 'needs-auth', method: header.method, salt: header.salt, fileName: handle.name };
  }

  const sql = await initSqlJs_();
  db = new sql.Database(rawBytes);
  fileHandle = handle;
  await initializeLoadedDb();
  await storeFileHandleInIDB(handle);
  return { status: 'ok', db, fileName: handle.name };
}

// Called from App after the user supplies their password or passkey key.
export async function completePendingOpenWithKey(
  key: CryptoKey,
  method: EncryptionMethod,
): Promise<{ db: Database; fileName: string }> {
  if (!pendingFileBytes || !pendingFileName) throw new Error('No pending file to open.');
  const sql = await initSqlJs_();

  const decryptedBytes = await decryptBytes(pendingFileBytes, key); // throws on wrong password

  db = new sql.Database(decryptedBytes);
  fileHandle = pendingHandle;
  const fileName = pendingFileName;

  const header = readEncryptionHeader(pendingFileBytes);
  encryptionKey = key;
  encryptionMethod = method;
  encryptionSalt = method === 'password' ? header.salt : null;

  pendingFileBytes = null;
  pendingHandle = null;
  pendingFileName = null;

  await initializeLoadedDb();
  if (fileHandle) await storeFileHandleInIDB(fileHandle);
  else fallbackFileName = fileName;

  return { db, fileName };
}

export async function saveDatabase(): Promise<void> {
  if (!db) return;
  if (!fileHandle) return; // fallback mode: skip auto-save, user downloads manually
  const data = db.export();
  let bytes: Uint8Array<ArrayBuffer> | ArrayBuffer;
  if (encryptionKey && encryptionMethod) {
    bytes = await encryptBytes(data, encryptionKey, encryptionMethod, encryptionSalt ?? undefined);
  } else {
    bytes = data.buffer as ArrayBuffer;
  }
  const blob = new Blob([bytes], { type: 'application/x-sqlite3' });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function downloadDatabase(): Promise<void> {
  if (!db) return;
  const data = db.export();
  let bytes: Uint8Array<ArrayBuffer> | ArrayBuffer;
  if (encryptionKey && encryptionMethod) {
    bytes = await encryptBytes(data, encryptionKey, encryptionMethod, encryptionSalt ?? undefined);
  } else {
    bytes = data.buffer as ArrayBuffer;
  }
  const blob = new Blob([bytes], { type: 'application/x-sqlite3' });

  if (hasFileSystemApi()) {
    try {
      const handle = await (window as Window).showSaveFilePicker({
        suggestedName: fallbackFileName,
        types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite3': ['.sqlite', '.db'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      // fall through to plain download
    }
  }

  const chosen = window.prompt('Save as:', fallbackFileName);
  if (chosen === null) return; // user cancelled
  const name = chosen.trim() || fallbackFileName;
  fallbackFileName = name.endsWith('.sqlite') || name.endsWith('.db') ? name : name + '.sqlite';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackFileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function openDatabaseFromFileInput(file: File): Promise<OpenResult> {
  await initSqlJs_();
  const rawBytes = new Uint8Array(await file.arrayBuffer());

  if (isEncryptedFile(rawBytes)) {
    const header = readEncryptionHeader(rawBytes);
    pendingFileBytes = rawBytes;
    pendingHandle = null;
    pendingFileName = file.name;
    return { status: 'needs-auth', method: header.method, salt: header.salt, fileName: file.name };
  }

  const sql = await initSqlJs_();
  db = new sql.Database(rawBytes);
  fileHandle = null;
  fallbackFileName = file.name;
  await initializeLoadedDb();
  return { status: 'ok', db, fileName: file.name };
}

export async function createNewDatabaseFallback(name = 'lister.sqlite'): Promise<{ db: Database; fileName: string }> {
  const newDb = await createNewDatabase();
  fallbackFileName = name;
  fileHandle = null;
  return { db: newDb, fileName: name };
}

export async function promptOpenFile(): Promise<OpenResult | null> {
  if (!window.showOpenFilePicker) {
    throw new Error('File System Access API is not supported in this browser. Please use Chrome or Edge.');
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite3': ['.sqlite', '.db'] } }],
    });
    return openDatabaseFromFile(handle);
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') return null;
    throw e;
  }
}

export async function promptSaveNewFile(): Promise<{ db: Database; fileName: string } | null> {
  if (!window.showSaveFilePicker) {
    throw new Error('File System Access API is not supported in this browser. Please use Chrome or Edge.');
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'lister.sqlite',
      types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite3': ['.sqlite', '.db'] } }],
    });
    fileHandle = handle;
    const newDb = await createNewDatabase();
    db = newDb;
    await saveDatabase();
    return { db: newDb, fileName: handle.name };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') return null;
    throw e;
  }
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// ── Encryption management (called from Settings) ──────────────────────────────

export async function enableEncryptionPassword(password: string): Promise<void> {
  if (!db) throw new Error('No database loaded');
  const { deriveKeyFromPassword } = await import('./crypto');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKeyFromPassword(password, salt);
  encryptionKey = key;
  encryptionMethod = 'password';
  encryptionSalt = salt;
  await saveDatabase();
  // In fallback (no FSA) mode saveDatabase() is a no-op; the next download will be encrypted.
}

export async function enableEncryptionPasskey(credentialId: Uint8Array, key: CryptoKey): Promise<void> {
  if (!db) throw new Error('No database loaded');
  const fileName = fileHandle?.name ?? fallbackFileName;
  await storePasskeyCredentialId(fileName, credentialId);
  encryptionKey = key;
  encryptionMethod = 'passkey';
  encryptionSalt = null;
  await saveDatabase();
}

export async function disableEncryption(): Promise<void> {
  if (!db) throw new Error('No database loaded');
  const fileName = fileHandle?.name ?? fallbackFileName;
  if (encryptionMethod === 'passkey') {
    await clearPasskeyCredentialId(fileName);
  }
  encryptionKey = null;
  encryptionMethod = null;
  encryptionSalt = null;
  await saveDatabase();
}

// ── Parameterized query helpers (use instead of string interpolation) ─────────

type SqlParam = string | number | null;

function queryRows(sql: string, params: SqlParam[] = []): { columns: string[]; values: SqlParam[][] } | null {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const columns = stmt.getColumnNames();
  const rows: SqlParam[][] = [];
  while (stmt.step()) rows.push(stmt.get() as SqlParam[]);
  stmt.free();
  return rows.length ? { columns, values: rows } : null;
}

function queryOne(sql: string, params: SqlParam[] = []): { columns: string[]; row: SqlParam[] } | null {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const columns = stmt.getColumnNames();
  const found = stmt.step();
  const row = found ? (stmt.get() as SqlParam[]) : null;
  stmt.free();
  return row ? { columns, row } : null;
}

function queryExists(sql: string, params: SqlParam[] = []): boolean {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const found = stmt.step();
  stmt.free();
  return found;
}

// Lists

export function getLists(): List[] {
  const database = getDb();
  const result = database.exec(`
    SELECT l.id, l.name, l.description, l.created_at,
           COUNT(ls.subscriber_id) as contact_count
    FROM lists l
    LEFT JOIN list_subscribers ls ON ls.list_id = l.id
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `);
  if (!result.length) return [];
  const [{ columns, values }] = result;
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as List;
  });
}

export function getList(id: number): List | null {
  const result = queryOne(
    `SELECT l.id, l.name, l.description, l.created_at, COUNT(ls.subscriber_id) as contact_count
     FROM lists l LEFT JOIN list_subscribers ls ON ls.list_id = l.id
     WHERE l.id = ? GROUP BY l.id`,
    [id]
  );
  if (!result) return null;
  const obj: Record<string, unknown> = {};
  result.columns.forEach((col, i) => { obj[col] = result.row[i]; });
  return obj as unknown as List;
}

export function createList(name: string, description: string): void {
  getDb().run('INSERT INTO lists (name, description) VALUES (?, ?)', [name, description]);
  saveDatabase();
}

export function updateList(id: number, name: string, description: string): void {
  getDb().run('UPDATE lists SET name = ?, description = ? WHERE id = ?', [name, description, id]);
  saveDatabase();
}

export function deleteList(id: number): void {
  getDb().run('DELETE FROM lists WHERE id = ?', [id]);
  saveDatabase();
}

// Contacts

export function getContacts(listId: number): Contact[] {
  const result = queryRows(
    'SELECT id, list_id, email, name, created_at FROM contacts WHERE list_id = ? ORDER BY created_at DESC',
    [listId]
  );
  if (!result) return [];
  return result.values.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as Contact;
  });
}

export function addContact(listId: number, email: string, name: string): void {
  getDb().run('INSERT INTO contacts (list_id, email, name) VALUES (?, ?, ?)', [listId, email.trim(), name.trim()]);
  saveDatabase();
}

export function addContacts(
  listId: number,
  contacts: Array<{ email: string; name: string }>,
  source = 'import'
): { added: number; skipped: number } {
  const database = getDb();
  let added = 0;
  let skipped = 0;

  for (const { email, name } of contacts) {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) continue;

    // Check if bounced
    if (queryExists('SELECT id FROM bounces WHERE email = ?', [trimmedEmail])) {
      skipped++;
      continue;
    }

    // Check if already exists in list
    if (queryExists('SELECT id FROM contacts WHERE list_id = ? AND email = ?', [listId, trimmedEmail])) {
      skipped++;
      continue;
    }

    database.run('INSERT INTO contacts (list_id, email, name) VALUES (?, ?, ?)', [listId, trimmedEmail, name.trim()]);
    added++;
  }

  // Record import history
  if (added > 0 || skipped > 0) {
    database.run(
      'INSERT INTO import_history (list_id, added_count, skipped_count, source) VALUES (?, ?, ?, ?)',
      [listId, added, skipped, source]
    );
  }

  saveDatabase();
  return { added, skipped };
}

export function deleteContacts(ids: number[]): void {
  if (!ids.length) return;
  if (!ids.every(Number.isInteger)) throw new Error('deleteContacts: non-integer id');
  getDb().run(`DELETE FROM contacts WHERE id IN (${ids.join(',')})`);
  saveDatabase();
}

// Campaigns

export function getCampaigns(): Campaign[] {
  const result = getDb().exec(`
    SELECT c.id, c.name, c.subject, c.body, c.list_id, c.sender_profile_id, c.theme_id,
           c.status, c.created_at, c.sent_at, l.name as list_name
    FROM campaigns c
    LEFT JOIN lists l ON l.id = c.list_id
    ORDER BY c.created_at DESC
  `);
  if (!result.length) return [];
  const [{ columns, values }] = result;
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as Campaign;
  });
}

export function getCampaign(id: number): Campaign | null {
  const result = queryOne(
    `SELECT c.id, c.name, c.subject, c.body, c.list_id, c.sender_profile_id, c.theme_id,
            c.status, c.created_at, c.sent_at, l.name as list_name
     FROM campaigns c LEFT JOIN lists l ON l.id = c.list_id
     WHERE c.id = ?`,
    [id]
  );
  if (!result) return null;
  const obj: Record<string, unknown> = {};
  result.columns.forEach((col, i) => { obj[col] = result.row[i]; });
  return obj as unknown as Campaign;
}

export function createCampaign(
  name: string, subject: string, body: string, listId: number | null, status: 'draft' | 'sent',
  senderProfileId?: number | null, themeId?: number | null,
): number {
  getDb().run(
    'INSERT INTO campaigns (name, subject, body, list_id, sender_profile_id, theme_id, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, subject, body, listId, senderProfileId ?? null, themeId ?? null, status, status === 'sent' ? new Date().toISOString() : null]
  );
  const result = getDb().exec('SELECT last_insert_rowid() as id');
  const id = result[0]?.values[0]?.[0] as number;
  saveDatabase();
  return id;
}

export function updateCampaign(
  id: number, name: string, subject: string, body: string, listId: number | null, status: 'draft' | 'sent',
  senderProfileId?: number | null, themeId?: number | null,
): void {
  const sentAt = status === 'sent' ? new Date().toISOString() : null;
  getDb().run(
    'UPDATE campaigns SET name = ?, subject = ?, body = ?, list_id = ?, sender_profile_id = ?, theme_id = ?, status = ?, sent_at = COALESCE(sent_at, ?) WHERE id = ?',
    [name, subject, body, listId, senderProfileId ?? null, themeId ?? null, status, sentAt, id]
  );
  saveDatabase();
}

export function deleteCampaign(id: number): void {
  getDb().run('DELETE FROM campaigns WHERE id = ?', [id]);
  saveDatabase();
}

export function duplicateCampaign(id: number): number {
  const campaign = getCampaign(id);
  if (!campaign) throw new Error('Campaign not found');
  return createCampaign(
    campaign.name + ' (Copy)',
    campaign.subject,
    campaign.body,
    campaign.list_id,
    'draft',
    campaign.sender_profile_id,
    campaign.theme_id,
  );
}

// Settings

export function getSettings(): SmtpSettings {
  const result = getDb().exec('SELECT key, value FROM settings');
  const map: Record<string, string> = {};
  if (result.length) {
    result[0].values.forEach(([k, v]) => { map[k as string] = v as string; });
  }
  return {
    smtp_host: map['smtp_host'] ?? '',
    smtp_port: map['smtp_port'] ?? '587',
    smtp_username: map['smtp_username'] ?? '',
    smtp_password: map['smtp_password'] ?? '',
    smtp_tls: map['smtp_tls'] ?? 'true',
    sender_name: map['sender_name'] ?? '',
    sender_email: map['sender_email'] ?? '',
  };
}

export function saveSettings(settings: SmtpSettings): void {
  const database = getDb();
  Object.entries(settings).forEach(([key, value]) => {
    database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  });
  saveDatabase();
}

// Tags

export function getTagsForContact(contactId: number): string[] {
  const result = getDb().exec(
    `SELECT tag FROM contact_tags WHERE contact_id = ${contactId} ORDER BY tag ASC`
  );
  if (!result.length) return [];
  return result[0].values.map((row) => row[0] as string);
}

export function getAllTags(): string[] {
  const result = getDb().exec(
    `SELECT DISTINCT tag FROM subscriber_tags ORDER BY tag ASC`
  );
  if (!result.length) return [];
  return result[0].values.map((row) => row[0] as string);
}

export function setTagsForContact(contactId: number, tags: string[]): void {
  const database = getDb();
  database.run('DELETE FROM contact_tags WHERE contact_id = ?', [contactId]);
  const unique = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  for (const tag of unique) {
    database.run('INSERT INTO contact_tags (contact_id, tag) VALUES (?, ?)', [contactId, tag]);
  }
  saveDatabase();
}

export function getContactsWithTag(listId: number, tag: string): Contact[] {
  const result = queryRows(
    `SELECT c.id, c.list_id, c.email, c.name, c.created_at
     FROM contacts c
     INNER JOIN contact_tags ct ON ct.contact_id = c.id
     WHERE c.list_id = ? AND ct.tag = ?
     ORDER BY c.created_at DESC`,
    [listId, tag]
  );
  if (!result) return [];
  return result.values.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as Contact;
  });
}

// Import history

export function addImportHistory(listId: number, addedCount: number, skippedCount: number, source: string): void {
  getDb().run(
    'INSERT INTO import_history (list_id, added_count, skipped_count, source) VALUES (?, ?, ?, ?)',
    [listId, addedCount, skippedCount, source]
  );
  saveDatabase();
}

export function getImportHistory(listId: number): ImportHistory[] {
  const result = queryRows(
    'SELECT id, list_id, added_count, skipped_count, source, created_at FROM import_history WHERE list_id = ? ORDER BY created_at DESC',
    [listId]
  );
  if (!result) return [];
  return result.values.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as ImportHistory;
  });
}

// Bounces

export function addBounce(email: string, reason: string): void {
  getDb().run(
    'INSERT OR REPLACE INTO bounces (email, reason) VALUES (?, ?)',
    [email, reason]
  );
  saveDatabase();
}

export function removeBounce(email: string): void {
  getDb().run('DELETE FROM bounces WHERE email = ?', [email]);
  saveDatabase();
}

export function getBounces(): Bounce[] {
  const result = getDb().exec(
    `SELECT id, email, reason, created_at FROM bounces ORDER BY created_at DESC`
  );
  if (!result.length) return [];
  const [{ columns, values }] = result;
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as Bounce;
  });
}

export function isEmailBounced(email: string): boolean {
  return queryExists('SELECT id FROM bounces WHERE email = ?', [email]);
}

// Rate limit

export function getRateLimit(): number {
  const result = getDb().exec(`SELECT value FROM settings WHERE key = 'rate_limit_ms'`);
  if (!result.length || !result[0].values.length) return 500;
  const val = Number(result[0].values[0][0]);
  return isNaN(val) ? 500 : val;
}

export function setRateLimit(ms: number): void {
  getDb().run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['rate_limit_ms', String(ms)]);
  saveDatabase();
}

// ── Subscribers ──────────────────────────────────────────────────────────────

function rowsToSubscribers(columns: string[], values: (string | number | null)[][]): Subscriber[] {
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as Subscriber;
  });
}

export function getAllSubscribers(): Subscriber[] {
  const result = getDb().exec(`
    SELECT s.id, s.email, s.name, s.created_at,
           COUNT(DISTINCT ls.list_id) as list_count,
           GROUP_CONCAT(DISTINCT st.tag) as tags
    FROM subscribers s
    LEFT JOIN list_subscribers ls ON ls.subscriber_id = s.id
    LEFT JOIN subscriber_tags st ON st.subscriber_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
  if (!result.length) return [];
  const [{ columns, values }] = result;
  return rowsToSubscribers(columns, values as (string | number | null)[][]);
}

export function getSubscriberById(id: number): Subscriber | null {
  const result = queryOne(
    `SELECT s.id, s.email, s.name, s.created_at,
            COUNT(DISTINCT ls.list_id) as list_count,
            GROUP_CONCAT(DISTINCT st.tag) as tags
     FROM subscribers s
     LEFT JOIN list_subscribers ls ON ls.subscriber_id = s.id
     LEFT JOIN subscriber_tags st ON st.subscriber_id = s.id
     WHERE s.id = ?
     GROUP BY s.id`,
    [id]
  );
  if (!result) return null;
  return rowsToSubscribers(result.columns, [result.row])[0];
}

export function getSubscribersForList(listId: number): Subscriber[] {
  const result = queryRows(
    `SELECT s.id, s.email, s.name, s.created_at,
            COUNT(DISTINCT ls2.list_id) as list_count,
            GROUP_CONCAT(DISTINCT st.tag) as tags
     FROM subscribers s
     JOIN list_subscribers ls ON ls.subscriber_id = s.id AND ls.list_id = ?
     LEFT JOIN list_subscribers ls2 ON ls2.subscriber_id = s.id
     LEFT JOIN subscriber_tags st ON st.subscriber_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [listId]
  );
  if (!result) return [];
  return rowsToSubscribers(result.columns, result.values);
}

export function upsertSubscriber(email: string, name: string): number {
  const trimmedEmail = email.trim();
  getDb().run('INSERT OR IGNORE INTO subscribers (email, name) VALUES (?, ?)', [trimmedEmail, name.trim()]);
  const result = queryOne('SELECT id FROM subscribers WHERE email = ?', [trimmedEmail]);
  return result!.row[0] as number;
}

export function addSubscriberToList(subscriberId: number, listId: number): void {
  getDb().run('INSERT OR IGNORE INTO list_subscribers (list_id, subscriber_id) VALUES (?, ?)', [listId, subscriberId]);
}

export function removeSubscriberFromList(subscriberId: number, listId: number): void {
  getDb().run('DELETE FROM list_subscribers WHERE subscriber_id = ? AND list_id = ?', [subscriberId, listId]);
  saveDatabase();
}

export function deleteSubscriber(id: number): void {
  getDb().run('DELETE FROM subscribers WHERE id = ?', [id]);
  saveDatabase();
}

export function deleteSubscribers(ids: number[]): void {
  if (!ids.length) return;
  if (!ids.every(Number.isInteger)) throw new Error('deleteSubscribers: non-integer id');
  getDb().run(`DELETE FROM subscribers WHERE id IN (${ids.join(',')})`);
  saveDatabase();
}

export function updateSubscriber(id: number, email: string, name: string): void {
  getDb().run('UPDATE subscribers SET email = ?, name = ? WHERE id = ?', [email.trim(), name.trim(), id]);
  saveDatabase();
}

export function getTagsForSubscriber(id: number): string[] {
  const result = queryRows('SELECT tag FROM subscriber_tags WHERE subscriber_id = ? ORDER BY tag ASC', [id]);
  if (!result) return [];
  return result.values.map((row) => row[0] as string);
}

export function setTagsForSubscriber(id: number, tags: string[]): void {
  const database = getDb();
  database.run('DELETE FROM subscriber_tags WHERE subscriber_id = ?', [id]);
  const unique = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  for (const tag of unique) {
    database.run('INSERT OR IGNORE INTO subscriber_tags (subscriber_id, tag) VALUES (?, ?)', [id, tag]);
  }
  saveDatabase();
}

export function getListsForSubscriber(id: number): List[] {
  const result = queryRows(
    `SELECT l.id, l.name, l.description, l.created_at,
            COUNT(ls2.subscriber_id) as contact_count
     FROM lists l
     JOIN list_subscribers ls ON ls.list_id = l.id AND ls.subscriber_id = ?
     LEFT JOIN list_subscribers ls2 ON ls2.list_id = l.id
     GROUP BY l.id
     ORDER BY l.name ASC`,
    [id]
  );
  if (!result) return [];
  return result.values.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as List;
  });
}

export function addSubscribers(
  listId: number | null,
  contacts: Array<{ email: string; name: string }>,
  source = 'import',
  tags: string[] = [],
  extraListIds: number[] = []
): { added: number; skipped: number } {
  const database = getDb();
  let added = 0;
  let skipped = 0;

  const uniqueTags = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  const allListIds = [...(listId !== null ? [listId] : []), ...extraListIds];

  for (const { email, name } of contacts) {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) continue;

    // Check if bounced
    if (queryExists('SELECT id FROM bounces WHERE email = ?', [trimmedEmail])) {
      skipped++;
      continue;
    }

    // Upsert into subscribers
    const subscriberId = upsertSubscriber(trimmedEmail, name);

    // Check if already in primary list (dedup metric)
    if (listId !== null) {
      if (queryExists('SELECT id FROM list_subscribers WHERE list_id = ? AND subscriber_id = ?', [listId, subscriberId])) {
        // Still apply tags to already-existing subscribers
        for (const tag of uniqueTags) {
          database.run('INSERT OR IGNORE INTO subscriber_tags (subscriber_id, tag) VALUES (?, ?)', [subscriberId, tag]);
        }
        skipped++;
        continue;
      }
    }

    // Add to all lists
    for (const lid of allListIds) {
      addSubscriberToList(subscriberId, lid);
    }

    // Apply tags
    for (const tag of uniqueTags) {
      database.run('INSERT OR IGNORE INTO subscriber_tags (subscriber_id, tag) VALUES (?, ?)', [subscriberId, tag]);
    }

    added++;
  }

  // Record import history for primary list
  if (listId !== null && (added > 0 || skipped > 0)) {
    database.run(
      'INSERT INTO import_history (list_id, added_count, skipped_count, source) VALUES (?, ?, ?, ?)',
      [listId, added, skipped, source]
    );
  }

  saveDatabase();
  return { added, skipped };
}

export function addSubscribersToList(subscriberIds: number[], listId: number, tags: string[] = []): { added: number } {
  const database = getDb();
  const uniqueTags = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  let added = 0;
  for (const subscriberId of subscriberIds) {
    if (queryExists('SELECT id FROM list_subscribers WHERE list_id = ? AND subscriber_id = ?', [listId, subscriberId])) continue;
    addSubscriberToList(subscriberId, listId);
    for (const tag of uniqueTags) {
      database.run('INSERT OR IGNORE INTO subscriber_tags (subscriber_id, tag) VALUES (?, ?)', [subscriberId, tag]);
    }
    added++;
  }
  saveDatabase();
  return { added };
}

export function getSubscribersWithTag(listId: number, tag: string): Subscriber[] {
  const result = queryRows(
    `SELECT s.id, s.email, s.name, s.created_at,
            COUNT(DISTINCT ls2.list_id) as list_count,
            GROUP_CONCAT(DISTINCT st2.tag) as tags
     FROM subscribers s
     JOIN list_subscribers ls ON ls.subscriber_id = s.id AND ls.list_id = ?
     JOIN subscriber_tags st ON st.subscriber_id = s.id AND st.tag = ?
     LEFT JOIN list_subscribers ls2 ON ls2.subscriber_id = s.id
     LEFT JOIN subscriber_tags st2 ON st2.subscriber_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [listId, tag]
  );
  if (!result) return [];
  return rowsToSubscribers(result.columns, result.values);
}

// ── Sender Profiles ───────────────────────────────────────────────────────────

function rowsToProfiles(columns: string[], values: (string | number | null)[][]): SenderProfile[] {
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as SenderProfile;
  });
}

export function getSenderProfiles(): SenderProfile[] {
  const result = getDb().exec(`SELECT * FROM sender_profiles ORDER BY is_default DESC, created_at ASC`);
  if (!result.length) return [];
  const [{ columns, values }] = result;
  return rowsToProfiles(columns, values as (string | number | null)[][]);
}

export function getSenderProfile(id: number): SenderProfile | null {
  const result = queryOne('SELECT * FROM sender_profiles WHERE id = ?', [id]);
  if (!result) return null;
  return rowsToProfiles(result.columns, [result.row])[0];
}

export function getDefaultSenderProfile(): SenderProfile | null {
  const result = getDb().exec(`SELECT * FROM sender_profiles ORDER BY is_default DESC, created_at ASC LIMIT 1`);
  if (!result.length || !result[0].values.length) return null;
  const { columns, values } = result[0];
  return rowsToProfiles(columns, values as (string | number | null)[][])[0];
}

export function createSenderProfile(p: Omit<SenderProfile, 'id' | 'created_at'>): number {
  const database = getDb();
  if (p.is_default) database.run('UPDATE sender_profiles SET is_default = 0');
  database.run(
    'INSERT INTO sender_profiles (name, sender_name, sender_email, smtp_host, smtp_port, smtp_username, smtp_password, smtp_tls, is_default, rate_limit_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [p.name, p.sender_name, p.sender_email, p.smtp_host, p.smtp_port, p.smtp_username, p.smtp_password, p.smtp_tls, p.is_default, p.rate_limit_ms ?? 0]
  );
  const idResult = database.exec('SELECT last_insert_rowid() as id');
  const id = idResult[0]?.values[0]?.[0] as number;
  saveDatabase();
  return id;
}

export function updateSenderProfile(id: number, p: Omit<SenderProfile, 'id' | 'created_at'>): void {
  const database = getDb();
  if (p.is_default) database.run('UPDATE sender_profiles SET is_default = 0 WHERE id != ?', [id]);
  database.run(
    'UPDATE sender_profiles SET name=?, sender_name=?, sender_email=?, smtp_host=?, smtp_port=?, smtp_username=?, smtp_password=?, smtp_tls=?, is_default=?, rate_limit_ms=? WHERE id=?',
    [p.name, p.sender_name, p.sender_email, p.smtp_host, p.smtp_port, p.smtp_username, p.smtp_password, p.smtp_tls, p.is_default, p.rate_limit_ms ?? 0, id]
  );
  saveDatabase();
}

export function deleteSenderProfile(id: number): void {
  getDb().run('DELETE FROM sender_profiles WHERE id = ?', [id]);
  saveDatabase();
}

export function senderProfileToSmtp(p: SenderProfile): SmtpSettings {
  return {
    smtp_host: p.smtp_host,
    smtp_port: p.smtp_port,
    smtp_username: p.smtp_username,
    smtp_password: p.smtp_password,
    smtp_tls: p.smtp_tls,
    sender_name: p.sender_name,
    sender_email: p.sender_email,
  };
}

// ── Campaign send log ─────────────────────────────────────────────────────────

export function recordCampaignSend(
  campaignId: number | null,
  subscriberId: number,
  status: 'sent' | 'failed',
  error = ''
): void {
  getDb().run(
    'INSERT INTO campaign_sends (campaign_id, subscriber_id, status, error) VALUES (?, ?, ?, ?)',
    [campaignId, subscriberId, status, error]
  );
}

export function getCampaignSendsForSubscriber(subscriberId: number): CampaignSend[] {
  const result = queryRows(
    `SELECT cs.id, cs.campaign_id, cs.subscriber_id, cs.sent_at, cs.status, cs.error,
            c.name as campaign_name, c.subject as campaign_subject
     FROM campaign_sends cs
     LEFT JOIN campaigns c ON c.id = cs.campaign_id
     WHERE cs.subscriber_id = ?
     ORDER BY cs.sent_at DESC
     LIMIT 100`,
    [subscriberId]
  );
  if (!result) return [];
  return result.values.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as CampaignSend;
  });
}

// ── Themes ──────────────────────────────────────────────────────────────────

function rowsToThemes(columns: string[], values: (string | number | null)[][]): EmailTheme[] {
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as EmailTheme;
  });
}

export function getThemes(): EmailTheme[] {
  const result = getDb().exec('SELECT * FROM themes ORDER BY is_builtin DESC, is_default DESC, created_at ASC');
  if (!result.length) return [];
  const [{ columns, values }] = result;
  return rowsToThemes(columns, values as (string | number | null)[][]);
}

export function getDefaultTheme(): EmailTheme | null {
  const result = getDb().exec('SELECT * FROM themes ORDER BY is_default DESC, is_builtin DESC, created_at ASC LIMIT 1');
  if (!result.length || !result[0].values.length) return null;
  const { columns, values } = result[0];
  return rowsToThemes(columns, values as (string | number | null)[][])[0];
}

export function createTheme(t: Omit<EmailTheme, 'id' | 'created_at'>): number {
  const database = getDb();
  if (t.is_default) database.run('UPDATE themes SET is_default = 0');
  database.run(
    'INSERT INTO themes (name, description, template_html, is_default, is_builtin) VALUES (?, ?, ?, ?, ?)',
    [t.name, t.description, t.template_html, t.is_default, t.is_builtin]
  );
  const id = database.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number;
  saveDatabase();
  return id;
}

export function updateTheme(id: number, t: Omit<EmailTheme, 'id' | 'created_at'>): void {
  const database = getDb();
  if (t.is_default) database.run('UPDATE themes SET is_default = 0 WHERE id != ?', [id]);
  database.run(
    'UPDATE themes SET name=?, description=?, template_html=?, is_default=?, is_builtin=? WHERE id=?',
    [t.name, t.description, t.template_html, t.is_default, t.is_builtin, id]
  );
  saveDatabase();
}

export function deleteTheme(id: number): void {
  getDb().run('DELETE FROM themes WHERE id = ?', [id]);
  saveDatabase();
}

export function setDefaultTheme(id: number): void {
  const database = getDb();
  database.run('UPDATE themes SET is_default = 0');
  database.run('UPDATE themes SET is_default = 1 WHERE id = ?', [id]);
  saveDatabase();
}

export function seedBuiltinThemes(): void {
  const database = getDb();
  for (let i = 0; i < BUILTIN_THEMES.length; i++) {
    const t = BUILTIN_THEMES[i];
    const exists = database.exec(
      `SELECT id FROM themes WHERE name = '${t.name.replace(/'/g, "''")}' AND is_builtin = 1`
    );
    if (!exists.length || !exists[0].values.length) {
      database.run(
        'INSERT INTO themes (name, description, template_html, is_default, is_builtin) VALUES (?, ?, ?, ?, 1)',
        [t.name, t.description, t.template_html, i === 0 ? 1 : 0]
      );
    } else {
      // Keep template up to date when built-in themes change
      database.run(
        'UPDATE themes SET template_html = ?, description = ? WHERE name = ? AND is_builtin = 1',
        [t.template_html, t.description, t.name]
      );
    }
  }
  // Migration: transfer default from 'Clean' to 'Clean (No Footer)' if user hasn't set a custom default
  const noFooterRow = database.exec(
    "SELECT id, is_default FROM themes WHERE name = 'Clean (No Footer)' AND is_builtin = 1"
  );
  const cleanRow = database.exec(
    "SELECT is_default FROM themes WHERE name = 'Clean' AND is_builtin = 1"
  );
  const noFooterId = noFooterRow[0]?.values[0]?.[0] as number | undefined;
  const noFooterIsDefault = noFooterRow[0]?.values[0]?.[1] as number | undefined;
  const cleanIsDefault = cleanRow[0]?.values[0]?.[0] as number | undefined;
  if (noFooterId && !noFooterIsDefault && cleanIsDefault === 1) {
    database.run('UPDATE themes SET is_default = 0 WHERE name = ? AND is_builtin = 1', ['Clean']);
    database.run('UPDATE themes SET is_default = 1 WHERE id = ?', [noFooterId]);
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

function rowsToTemplates(columns: string[], values: (string | number | null)[][]): EmailTemplate[] {
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as EmailTemplate;
  });
}

export function getTemplates(): EmailTemplate[] {
  const result = getDb().exec('SELECT * FROM templates ORDER BY is_builtin DESC, created_at ASC');
  if (!result.length) return [];
  const [{ columns, values }] = result;
  return rowsToTemplates(columns, values as (string | number | null)[][]);
}

export function getTemplate(id: number): EmailTemplate | null {
  const result = queryOne('SELECT * FROM templates WHERE id = ?', [id]);
  if (!result) return null;
  return rowsToTemplates(result.columns, [result.row])[0];
}

export function createTemplate(t: Omit<EmailTemplate, 'id' | 'created_at'>): number {
  const database = getDb();
  database.run(
    'INSERT INTO templates (name, description, subject, body, is_builtin) VALUES (?, ?, ?, ?, ?)',
    [t.name, t.description, t.subject, t.body, t.is_builtin]
  );
  const id = database.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number;
  saveDatabase();
  return id;
}

export function updateTemplate(id: number, t: Omit<EmailTemplate, 'id' | 'created_at'>): void {
  getDb().run(
    'UPDATE templates SET name=?, description=?, subject=?, body=?, is_builtin=? WHERE id=?',
    [t.name, t.description, t.subject, t.body, t.is_builtin, id]
  );
  saveDatabase();
}

export function deleteTemplate(id: number): void {
  getDb().run('DELETE FROM templates WHERE id = ?', [id]);
  saveDatabase();
}

export function duplicateTemplate(id: number): number {
  const t = getTemplate(id);
  if (!t) throw new Error('Template not found');
  return createTemplate({
    name: t.name + ' (Copy)',
    description: t.description,
    subject: t.subject,
    body: t.body,
    is_builtin: 0,
  });
}

// ── Bulk wipe ─────────────────────────────────────────────────────────────────

export function wipeAllCampaigns(): void {
  getDb().run('DELETE FROM campaigns');
  saveDatabase();
}

export function wipeAllSubscribers(): void {
  getDb().run('DELETE FROM subscribers');
  saveDatabase();
}

export function resetAllData(): void {
  const d = getDb();
  d.run('DELETE FROM campaigns');
  d.run('DELETE FROM campaign_sends');
  d.run('DELETE FROM subscribers');
  d.run('DELETE FROM list_subscribers');
  d.run('DELETE FROM subscriber_tags');
  d.run('DELETE FROM lists');
  d.run('DELETE FROM contacts');
  d.run('DELETE FROM contact_tags');
  d.run('DELETE FROM import_history');
  d.run('DELETE FROM bounces');
  saveDatabase();
}

// ── Export ────────────────────────────────────────────────────────────────────

function queryAllRows(sql: string): Record<string, unknown>[] {
  const result = getDb().exec(sql);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

export function exportAllData(): object {
  return {
    exported_at: new Date().toISOString(),
    version: 1,
    campaigns: queryAllRows('SELECT id,name,subject,body,status,created_at,sent_at FROM campaigns'),
    lists: queryAllRows('SELECT * FROM lists'),
    subscribers: queryAllRows('SELECT * FROM subscribers'),
    list_subscribers: queryAllRows('SELECT * FROM list_subscribers'),
    subscriber_tags: queryAllRows('SELECT * FROM subscriber_tags'),
    templates: queryAllRows('SELECT * FROM templates WHERE is_builtin=0'),
    themes: queryAllRows('SELECT * FROM themes WHERE is_builtin=0'),
    bounces: queryAllRows('SELECT * FROM bounces'),
  };
}

export function exportSubscribersCSV(): string {
  const rows = queryAllRows(
    `SELECT s.email, s.name, s.created_at,
     GROUP_CONCAT(DISTINCT st.tag) AS tags,
     GROUP_CONCAT(DISTINCT l.name) AS lists
     FROM subscribers s
     LEFT JOIN subscriber_tags st ON st.subscriber_id = s.id
     LEFT JOIN list_subscribers ls ON ls.subscriber_id = s.id
     LEFT JOIN lists l ON l.id = ls.list_id
     GROUP BY s.id`
  );
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = ['email', 'name', 'created_at', 'tags', 'lists'];
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

export function seedBuiltinTemplates(): void {
  const database = getDb();
  for (const t of BUILTIN_TEMPLATES) {
    const alreadyExists = queryExists('SELECT id FROM templates WHERE name = ? AND is_builtin = 1', [t.name]);
    if (!alreadyExists) {
      database.run(
        'INSERT INTO templates (name, description, subject, body, is_builtin) VALUES (?, ?, ?, ?, 1)',
        [t.name, t.description, t.subject, t.body]
      );
    } else {
      database.run(
        'UPDATE templates SET subject=?, body=?, description=? WHERE name=? AND is_builtin=1',
        [t.subject, t.body, t.description, t.name]
      );
    }
  }
}
