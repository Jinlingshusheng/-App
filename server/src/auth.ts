import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { client } from './db';

/** 密码哈希（scrypt，带盐） */
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  try {
    const cand = crypto.scryptSync(pw, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return cand.length === expected.length && crypto.timingSafeEqual(cand, expected);
  } catch {
    return false;
  }
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** 密码规范：8 位以上，只能包含数字或字母（允许纯数字 / 字母加数字） */
export function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 8) return '密码至少 8 位';
  if (!/^[A-Za-z0-9]+$/.test(pw)) return '密码只允许由字母和数字组成';
  return null;
}

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  name: string | null;
}

interface AuthedRequest extends Request {
  user?: AuthUser;
}

export async function loadTokenUser(token: string): Promise<AuthUser | null> {
  const { data, error } = await client
    .from('sessions')
    .select('user_id, users(id, username, role, name)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(`校验登录状态失败: ${error.message}`);
  const u = (data?.users ?? null) as any;
  if (!u) return null;
  return { id: u.id, username: u.username, role: u.role, name: u.name ?? null };
}

/** 需要登录 */
export function requireAuth() {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const h = req.headers['authorization'] as string | undefined;
      const token = (h || '').replace(/^Bearer\s+/i, '').trim();
      if (!token) {
        res.status(401).json({ error: '未登录' });
        return;
      }
      const user = await loadTokenUser(token);
      if (!user) {
        res.status(401).json({ error: '登录已过期，请重新登录' });
        return;
      }
      req.user = user;
      next();
    } catch (e) {
      next(e);
    }
  };
}

/** 仅教师 */
export function requireTeacher() {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'teacher') {
      res.status(403).json({ error: '仅教师可操作' });
      return;
    }
    next();
  };
}

/** 仅家长 */
export function requireParent() {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'parent') {
      res.status(403).json({ error: '仅家长可操作' });
      return;
    }
    next();
  };
}

/** 由认证中间件填充的请求对象 */
export type { AuthedRequest }; 

/** 确保预置教师账号存在 */
export async function ensureTeacher(): Promise<void> {
  const { data, error } = await client
    .from('users')
    .select('id')
    .eq('username', 'WX')
    .maybeSingle();
  if (error) throw new Error(`初始化账号失败: ${error.message}`);
  if (!data) {
    const { error: ins } = await client.from('users').insert({
      username: 'WX',
      password_hash: hashPassword('WX83352845'),
      role: 'teacher',
      name: '教师',
    });
    if (ins) throw new Error(`创建教师账号失败: ${ins.message}`);
  }
}