import { Router } from 'express';
import { client } from '../db';
import { requireAuth, requireParent } from '../auth';
import type { AuthedRequest } from '../auth';

const router = Router();

/** 家长：首页概览（当前任务 + 绑定孩子 + 自己孩子的申报/得分） */
router.get('/me/overview', requireAuth(), requireParent(), async (req: AuthedRequest, res, next) => {
  try {
    // 当前进行中任务
    const { data: task, error: tErr } = await client
      .from('tasks')
      .select('id, name, description, requirement, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (tErr) throw new Error(`查询当前任务失败: ${tErr.message}`);

    // 家长绑定的孩子
    const { data: binding, error: bErr } = await client
      .from('parent_bindings')
      .select('id, student_id, students(id, student_no, name)')
      .eq('user_id', req.user!.id)
      .maybeSingle();
    if (bErr) throw new Error(`查询绑定失败: ${bErr.message}`);
    const student = (binding?.students ?? null) as any;

    let mySubmission: any = null;
    if (task && student) {
      const { data: sub, error: sErr } = await client
        .from('submissions')
        .select(
          'id, task_id, theme, created_at, updated_at, scores(content, expression, poise, total, best_star, updated_at)'
        )
        .eq('task_id', task.id)
        .eq('student_id', student.id)
        .maybeSingle();
      if (sErr) throw new Error(`查询申报失败: ${sErr.message}`);
      if (sub) {
        mySubmission = { id: sub.id, theme: sub.theme, created_at: sub.created_at, updated_at: sub.updated_at, score: sub.scores };
      }
    }

    // 已申报人数
    let submittedCount = 0;
    if (task) {
      const { count, error: cErr } = await client
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', task.id);
      if (cErr) throw new Error(`统计失败: ${cErr.message}`);
      submittedCount = count ?? 0;
    }

    res.json({ task: task ?? null, student, mySubmission, submittedCount });
  } catch (e) {
    next(e);
  }
});

export default router;