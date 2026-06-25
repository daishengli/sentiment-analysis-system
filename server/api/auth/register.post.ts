import bcrypt from 'bcryptjs'
import db from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, email, password } = body

  // 验证必填字段
  if (!username || !email || !password) {
    throw createError({
      statusCode: 400,
      message: '用户名、邮箱和密码不能为空',
    })
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      message: '邮箱格式不正确',
    })
  }

  // 验证密码长度
  if (password.length < 6) {
    throw createError({
      statusCode: 400,
      message: '密码长度不能少于6位',
    })
  }

  try {
    // 检查用户是否已存在
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
      .get(email, username)

    if (existingUser) {
      throw createError({
        statusCode: 409,
        message: '用户名或邮箱已被注册',
      })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const result = db
      .prepare(
        `INSERT INTO users (username, email, password, plan, created_at, updated_at)
         VALUES (?, ?, ?, 'free', datetime('now'), datetime('now'))`,
      )
      .run(username, email, hashedPassword)

    const userId = result.lastInsertRowid

    // 生成 Token
    const { generateToken } = await import('~/server/utils/auth')
    const token = generateToken({
      userId: userId as number,
      username,
      email,
    })

    return {
      success: true,
      message: '注册成功',
      data: {
        userId,
        username,
        email,
        plan: 'free',
        token,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '注册失败: ' + error.message,
    })
  }
})
