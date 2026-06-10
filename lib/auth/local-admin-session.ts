import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export const LOCAL_ADMIN_EMAIL = 'admin@agendasalud.cl'
const COOKIE_NAME = 'agendasalud_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 8

type LocalAdminPayload = {
  email: string
  role: 'admin' | 'user'
  name?: string
  centerId?: string
  iat: number
  exp: number
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET no esta configurado. Agrega esta variable de entorno antes de continuar.')
  }
  return secret
}

function bytesToBase64url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function textToBase64url(input: string) {
  return bytesToBase64url(new TextEncoder().encode(input))
}

function base64urlToText(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return bytesToBase64url(new Uint8Array(signature))
}

async function createSessionValue(input?: { email?: string; role?: 'admin' | 'user'; name?: string; centerId?: string }) {
  const now = Math.floor(Date.now() / 1000)
  const payload = textToBase64url(JSON.stringify({
    email: input?.email ?? LOCAL_ADMIN_EMAIL,
    role: input?.role ?? 'admin',
    name: input?.name ?? '',
    centerId: input?.centerId ?? '',
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  } satisfies LocalAdminPayload))

  return `${payload}.${await sign(payload)}`
}

export async function setLocalAdminSession(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, await createSessionValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function setLocalUserSession(
  response: NextResponse,
  user: { email: string; role: 'admin' | 'user'; name?: string; centerId?: string }
) {
  response.cookies.set(COOKIE_NAME, await createSessionValue(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearLocalAdminSession(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 0,
  })
}

async function verifySessionValue(value?: string): Promise<LocalAdminPayload | null> {
  if (!value) return null

  const [payload, signature] = value.split('.')
  const expectedSignature = await sign(payload)
  const a = new TextEncoder().encode(expectedSignature)
  const b = new TextEncoder().encode(signature)
  if (a.length !== b.length) return null
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  if (!payload || !signature || diff !== 0) return null

  try {
    const parsed = JSON.parse(base64urlToText(payload)) as LocalAdminPayload
    const now = Math.floor(Date.now() / 1000)

    if (!parsed.email || !['admin', 'user'].includes(parsed.role) || parsed.exp < now) return null
    return parsed
  } catch {
    return null
  }
}

export async function getLocalAdminSession() {
  const cookieStore = await cookies()
  return verifySessionValue(cookieStore.get(COOKIE_NAME)?.value)
}

export function getLocalAdminSessionFromRequest(request: NextRequest) {
  return verifySessionValue(request.cookies.get(COOKIE_NAME)?.value)
}
