import { Router } from 'express';
import { client } from '../db';
import { generateToken, hashPassword, requireAuth, validatePassword, verifyPassword } from '../auth';
import type { AuthedRequest } from '../auth';

const router = Router();

const getToken = (req: AuthedRequest): string => {
  const h = req.headers['authorization'] as string | undefined;
  return (h || '').replace(/^Bearer\s+/i, '').trim();
};

/** 发布/修改主题等业务流程调用：创建登录会话 */
export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 天
  const { error } = await client.from('sessions').insert({
    user_id: userId,
    token,
    expires_at: expires.toISOString(),
  });
  if (error) throw new Error(`创建会话失败: ${error.message}`);
  return token;
}

/** 家长注册：创建账号 + 验证班级名单 + 绑定孩子 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, name, student_no, student_name } = req.body || {};
    if (!username || !password || !name || !student_no || !student_name) {
      res.status(400).json({ error: '请填写完整注册信息' });
      return;
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      res.status(400).json({ error: pwErr });
      return;
    }

    // 校验班级名单匹配
    const { data: stu, error: sErr } = await client
      .from('students')
      .select('id, student_no, name')
      .eq('student_no', String(student_no).trim())
      .maybeSingle();
    if (sErr) throw new Error(`查询名单失败: ${sErr.message}`);
    if (!stu || stu.name !== String(student_name).trim()) {
      res.status(400).json({ error: '学号或姓名与班级名单不匹配，请核对后重试' });
      return;
    }

    // 用户名唯一
    const { data: dup, error: dErr } = await client
      .from('users')
      .select('id')
      .eq('username', String(username).trim())
      .maybeSingle();
    if (dErr) throw new Error(`查询用户名失败: ${dErr.message}`);
    if (dup) {
      res.status(400).json({ error: '该用户名已被注册，请更换' });
      return;
    }

    // 创建家长账号
    const { data: user, error: uErr } = await client
      .from('users')
      .insert({
        username: String(username).trim(),
        password_hash: hashPassword(password),
        role: 'parent',
        name: String(name).trim(),
      })
      .select('id')
      .single();
    if (uErr) throw new Error(`注册失败: ${uErr.message}`);

    // 绑定孩子
    const { error: bErr } = await client.from('parent_bindings').insert({
      user_id: user.id,
      student_id: stu.id,
    });
    if (bErr) throw new Error(`绑定孩子失败: ${bErr.message}`);

    const token = await createSession(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, username: String(username).trim(), role: 'parent', name: String(name).trim() },
      bound_student: { id: stu.id, student_no: stu.student_no, name: stu.name },
    });
  } catch (e) {
    next(e);
  }
});

/** 登录（教师或家长） */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: '请输入用户名和密码' });
      return;
    }
    const { data, error } = await client
      .from('users')
      .select('id, username, password_hash, role, name')
      .eq('username', String(username).trim())
      .maybeSingle();
    if (error) throw new Error(`登录失败: ${error.message}`);
    if (!data || !verifyPassword(String(password), data.password_hash)) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }
    const token = await createSession(data.id);
    res.json({
      token,
      user: { id: data.id, username: data.username, role: data.role, name: data.name },
    });
  } catch (e) {
    next(e);
  }
});

/** 当前用户信息 */
router.get('/me', requireAuth(), async (req: AuthedRequest, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (e) {
    next(e);
  }
});

/** 退出登录 */
router.post('/logout', requireAuth(), async (req: AuthedRequest, res, next) => {
  try {
    const token = getToken(req);
    if (token) {
      await client.from('sessions').delete().eq('token', token);
    }
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

/** 修改密码（教师首登改密 / 家长改密） */
router.post('/change-password', requireAuth(), async (req: AuthedRequest, res, next) => {
  try {
    const { old_password, new_password } = req.body || {};
    if (!old_password || !new_password) {
      res.status(400).json({ error: '请填写原密码和新密码' });
      return;
    }
    const { data, error } = await client
      .from('users')
      .select('id, password_hash')
      .eq('id', req.user!.id)
      .maybeSingle();
    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data || !verifyPassword(String(old_password), data.password_hash)) {
      res.status(400).json({ error: '原密码错误' });
      return;
    }
    const pwErr = validatePassword(String(new_password));
    if (pwErr) {
      res.status(400).json({ error: pwErr });
      return;
    }
    const { error: uErr } = await client
      .from('users')
      .update({ password_hash: hashPassword(String(new_password)) })
      .eq('id', req.user!.id);
    if (uErr) throw new Error(`修改密码失败: ${uErr.message}`);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;