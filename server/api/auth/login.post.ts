import bcrypt from 'bcryptjs'
import db from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: '邮箱和密码不能为空',
    })
  }

  try {
    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any

    if (!user) {
      throw createError({
        statusCode: 401,
        message: '邮箱或密码错误',
      })
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      throw createError({
        statusCode: 401,
        message: '邮箱或密码错误',
      })
    }

    // 生成 Token
    const { generateToken } = await import('~/server/utils/auth')
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    })

    return {
      success: true,
      message: '登录成功',
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan,
        expiresAt: user.expires_at,
        token,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '登录失败: ' + error.message,
    })
  }
})
