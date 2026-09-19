export const SESSION_COOKIE_NAME = 'pizzawise_session'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000

export function sessionCookieOptions (): {
  httpOnly: true
  path: string
  sameSite: 'lax'
  secure: boolean
  maxAge: number
} {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS
  }
}
