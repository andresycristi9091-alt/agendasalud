import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export const LOCAL_ADMIN_EMAIL = 'admin@agendasalud.cl'
const COOKIE_NAME = 'agendasalud_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 8

type LocalAdminPayload = {
  email: string
  role: 'admin'
  iat: number
  exp: number
}

function getSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}:${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
  )
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

async function createSessionValue() {
  const now = Math.floor(Date.now() / 1000)
  const payload = textToBase64url(JSON.stringify({
    email: LOCAL_ADMIN_EMAIL,
    role: 'admin',
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
  if (!payload || !signature || (await sign(payload)) !== signature) return null

  try {
    const parsed = JSON.parse(base64urlToText(payload)) as LocalAdminPayload
    const now = Math.floor(Date.now() / 1000)

    if (parsed.email !== LOCAL_ADMIN_EMAIL || parsed.role !== 'admin' || parsed.exp < now) return null
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
