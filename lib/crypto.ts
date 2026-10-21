import 'server-only'
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { env, requireEnv } from '@/lib/env'

// AES-256-GCM envelope for third-party tokens (Plaid access tokens, OAuth
// refresh tokens). Format: v1.<iv>.<tag>.<ciphertext>, each part base64url.

const VERSION = 'v1'

function key(): Buffer {
  const raw = requireEnv(env.tokenEncryptionKey, 'TOKEN_ENCRYPTION_KEY')
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)')
  }
  return buf
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

export function decryptToken(sealed: string): string {
  const [version, iv, tag, ciphertext] = sealed.split('.')
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error('Unrecognised token envelope')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8')
}

/** HMAC-signed, expiring state value for OAuth round-trips. */
export function signState(payload: Record<string, string>, ttlSeconds = 600): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 })).toString('base64url')
  const mac = createHmac('sha256', key()).update(body).digest('base64url')
  return `${body}.${mac}`
}

export function verifyState<T extends Record<string, string>>(state: string): T | null {
  const [body, mac] = state.split('.')
  if (!body || !mac) return null
  const expected = createHmac('sha256', key()).update(body).digest()
  const given = Buffer.from(mac, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T & { exp: number }
  if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null
  return parsed
}

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex')
}
