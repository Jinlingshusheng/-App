import { Router } from 'express';
import { client } from '../db';
import { requireAuth, requireParent } from '../auth';
import type { AuthedRequest } from '../auth';

const router = Router();

/** 排序：学号升序（数字优先）*/
function sortByStudentNo(rows: any[]): any[] {
  return [...rows].sort((a, b) =>
    String(a.student_no).localeCompare(String(b.student_no), 'zh-CN', { numeric: true })
  );
}

/** 任务申报/记录列表（教师打分、家长查看全班） */
router.get('/tasks/:taskId/submissions', requireAuth(), async (req: AuthedRequest, res, next) => {
  try {
    const taskId = Number(req.params.taskId);
    const { data, error } = await client
      .from('submissions')
      .select(
        'id, task_id, theme, created_at, updated_at, students(id, student_no, name), scores(id, content, expression, poise, total, best_star, updated_at)'
      )
      .eq('task_id', taskId);
    if (error) throw new Error(`查询申报记录失败: ${error.message}`);

    const rows = (data ?? []).map((r: any) => {
      const sc = (Array.isArray(r.scores) ? r.scores[0] : r.scores) as any;
      return {
        id: r.id,
        task_id: r.task_id,
        student_no: r.students?.student_no ?? '',
        student_name: r.students?.name ?? '未知同学',
        theme: r.theme ?? '',
        content: sc?.content ?? null,
        expression: sc?.expression ?? null,
        poise: sc?.poise ?? null,
        total: sc?.total ?? null,
        best_star: sc?.best_star ?? false,
        scored_at: sc?.updated_at ?? null,
      };
    });
    res.json({ submissions: sortByStudentNo(rows) });
  } catch (e) {
    next(e);
  }
});

/** 家长：为绑定孩子申报展示主题（打分别前可修改） */
router.post('/tasks/:taskId/submissions', requireAuth(), requireParent(), async (req: AuthedRequest, res, next) => {
  try {
    const taskId = Number(req.params.taskId);
    const { student_no, student_name, theme } = req.body || {};
    if (!student_no || !student_name || !theme) {
      res.status(400).json({ error: '请填写学号、姓名和展示主题' });
      return;
    }
    const themeText = String(theme).trim();
    if (!themeText) {
      res.status(400).json({ error: '请填写展示主题' });
      return;
    }

    // 家长只能操作自己绑定的孩子（后端校验，不依赖前端）
    const { data: binding, error: bErr } = await client
      .from('parent_bindings')
      .select('id, student_id, students(id, student_no, name)')
      .eq('user_id', req.user!.id)
      .maybeSingle();
    if (bErr) throw new Error(`查询绑定失败: ${bErr.message}`);
    const child = binding?.students as any;
    if (!child) {
      res.status(403).json({ error: '您尚未绑定孩子，请先绑定' });
      return;
    }
    if (
      child.student_no !== String(student_no).trim() ||
      child.name !== String(student_name).trim()
    ) {
      res.status(403).json({ error: '学号或姓名与您绑定的孩子不一致' });
      return;
    }

    // 主题唯一性校验：同任务内已有其他同学申报相同时拦截
    const { data: dup, error: dupErr } = await client
      .from('submissions')
      .select('id, student_id, theme')
      .eq('task_id', taskId)
      .eq('theme', themeText);
    if (dupErr) throw new Error(`校验主题失败: ${dupErr.message}`);
    const taken = (dup || []).some((s: any) => s.student_id !== child.id);
    if (taken) {
      res.status(409).json({ error: '该主题已被申报，请更换主题' });
      return;
    }

    // 已有申报
    const { data: existing, error: eErr } = await client
      .from('submissions')
      .select('id, task_id, student_id, theme')
      .eq('task_id', taskId)
      .eq('student_id', child.id)
      .maybeSingle();
    if (eErr) throw new Error(`查询申报失败: ${eErr.message}`);

    if (existing) {
      // 若已打分则不允许修改主题
      const { data: scored, error: scErr } = await client
        .from('scores')
        .select('id')
        .eq('submission_id', existing.id)
        .maybeSingle();
      if (scErr) throw new Error(`查询打分失败: ${scErr.message}`);
      if (scored) {
        res.status(400).json({ error: '老师已打分，主题不能再修改' });
        return;
      }
      const { data: upd, error: updErr } = await client
        .from('submissions')
        .update({ theme: themeText, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id, task_id, student_id, theme')
        .single();
      if (updErr) throw new Error(`修改主题失败: ${updErr.message}`);
      res.json({ submission: upd });
      return;
    }

    const { data: created, error: insErr } = await client
      .from('submissions')
      .insert({ task_id: taskId, student_id: child.id, theme: themeText })
      .select('id, task_id, student_id, theme')
      .single();
    if (insErr) {
      if ((insErr as any).code === '23505') {
        res.status(409).json({ error: '该主题已被申报，请更换主题' });
        return;
      }
      throw new Error(`申报失败: ${insErr.message}`);
    }
    res.status(201).json({ submission: created });
  } catch (e) {
    next(e);
  }
});

export default router;
export { sortByStudentNo };