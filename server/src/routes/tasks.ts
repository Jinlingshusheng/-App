import { Router } from 'express';
import { client } from '../db';
import { requireAuth, requireTeacher } from '../auth';
import type { AuthedRequest } from '../auth';

const router = Router();

/** 教师：所有任务（按创建时间倒序） */
router.get('/', requireAuth(), requireTeacher(), async (_req, res, next) => {
  try {
    const { data, error } = await client
      .from('tasks')
      .select('id, name, description, requirement, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`查询任务失败: ${error.message}`);
    res.json({ tasks: data ?? [] });
  } catch (e) {
    next(e);
  }
});

/** 当前进行中的任务（教师与家长都可查看） */
router.get('/active', requireAuth(), async (_req, res, next) => {
  try {
    const { data, error } = await client
      .from('tasks')
      .select('id, name, description, requirement, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`查询当前任务失败: ${error.message}`);
    res.json({ task: data ?? null });
  } catch (e) {
    next(e);
  }
});

/** 教师：创建任务（创建后设为当前进行中） */
router.post('/', requireAuth(), requireTeacher(), async (req, res, next) => {
  try {
    const { name, description, requirement, is_active } = req.body || {};
    if (!name) {
      res.status(400).json({ error: '请填写任务名称' });
      return;
    }
    const { data, error } = await client
      .from('tasks')
      .insert({
        name: String(name).trim(),
        description: description || '',
        requirement: requirement || '',
        is_active: !!is_active,
      })
      .select('id, name, description, requirement, is_active, created_at')
      .single();
    if (error) throw new Error(`创建任务失败: ${error.message}`);
    res.status(201).json({ task: data });
  } catch (e) {
    next(e);
  }
});

/** 教师：更新任务 */
router.put('/:id', requireAuth(), requireTeacher(), async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, description, requirement, is_active } = req.body || {};
    const patch: Record<string, string | boolean> = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (description !== undefined) patch.description = description;
    if (requirement !== undefined) patch.requirement = requirement;
    if (is_active !== undefined) patch.is_active = !!is_active;
    const { data, error } = await client
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select('id, name, description, requirement, is_active, created_at')
      .maybeSingle();
    if (error) throw new Error(`更新任务失败: ${error.message}`);
    if (!data) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }
    res.json({ task: data });
  } catch (e) {
    next(e);
  }
});

/** 教师：删除任务 */
router.delete('/:id', requireAuth(), requireTeacher(), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { error } = await client.from('tasks').delete().eq('id', id);
    if (error) throw new Error(`删除任务失败: ${error.message}`);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;