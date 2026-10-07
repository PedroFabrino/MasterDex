import crypto from 'node:crypto'

const SESSION_SECRET = process.env.SESSION_SECRET || 'masterdex-session-auth-secret-key-2026'

export interface GoogleTokenPayload {
  googleId: string
  email: string
  name: string
  avatarUrl: string | null
}

export type VerifyGoogleResult =
  | { ok: true; payload: GoogleTokenPayload }
  | { ok: false; error: string }

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url')
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')
  return `${payload}.${hmac}`
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [payload, sig] = parts
    if (!payload || !sig) return null

    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')
    if (sig.length !== expectedSig.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    if (!data.userId || typeof data.userId !== 'string') return null
    return { userId: data.userId }
  } catch {
    return null
  }
}

export async function verifyGoogleIdToken(credential: string): Promise<VerifyGoogleResult> {
  if (!credential || typeof credential !== 'string') {
    return { ok: false, error: 'Invalid Google credential token' }
  }

  // Support deterministic test tokens in test environment
  if (process.env.NODE_ENV === 'test' && credential.startsWith('test-token:')) {
    const parts = credential.split(':')
    const sub = parts[1] || 'google-test-sub'
    const email = parts[2] || 'test@example.com'
    const name = parts[3] || 'Test Collector'
    const avatar = parts[4] || null
    return {
      ok: true,
      payload: {
        googleId: sub,
        email,
        name,
        avatarUrl: avatar,
      },
    }
  }

  try {
    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    )
    if (!tokenRes.ok) {
      return { ok: false, error: 'Invalid Google credential token' }
    }

    const tokenData = (await tokenRes.json()) as any
    const nowSec = Math.floor(Date.now() / 1000)
    if (tokenData.exp && Number(tokenData.exp) < nowSec) {
      return { ok: false, error: 'Google token has expired' }
    }

    const expectedClientId =
      process.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      '8010736190-ni98j51d06uo3n48kp31ia5atbk9iln5.apps.googleusercontent.com'

    if (expectedClientId && tokenData.aud && tokenData.aud !== expectedClientId) {
      return { ok: false, error: 'Token audience mismatch' }
    }

    if (!tokenData.sub || !tokenData.email) {
      return { ok: false, error: 'Invalid Google credential token' }
    }

    return {
      ok: true,
      payload: {
        googleId: tokenData.sub,
        email: tokenData.email,
        name: tokenData.name || tokenData.email.split('@')[0],
        avatarUrl: tokenData.picture || null,
      },
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Invalid Google credential token' }
  }
}
