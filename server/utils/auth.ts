import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

export interface TokenPayload {
  userId: number
  username: string
  email: string
}

export function generateToken(payload: TokenPayload): string {
  const config = useRuntimeConfig()
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const config = useRuntimeConfig()
    return jwt.verify(token, config.jwtSecret) as TokenPayload
  } catch {
    return null
  }
}

export function getTokenFromHeader(event: H3Event): string | null {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

export async function requireAuth(event: H3Event): Promise<TokenPayload> {
  const token = getTokenFromHeader(event)
  if (!token) {
    throw createError({
      statusCode: 401,
      message: '未登录或登录已过期',
    })
  }

  const payload = verifyToken(token)
  if (!payload) {
    throw createError({
      statusCode: 401,
      message: 'Token 无效或已过期',
    })
  }

  return payload
}
