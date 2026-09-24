import { Router } from 'express';
import { client } from '../db';
import { requireAuth, requireTeacher } from '../auth';

const router = Router();

/** 教师：打分（内容/表达/仪态 1-10，总分自动合计；最佳星标独立） */
router.post('/submissions/:submissionId/score', requireAuth(), requireTeacher(), async (req, res, next) => {
  try {
    const submissionId = Number(req.params.submissionId);
    const { content, expression, poise, best_star } = req.body || {};

    const nums = [content, expression, poise].map((v) => Number(v));
    if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 10)) {
      res.status(400).json({ error: '内容、表达、仪态分值需为 1-10 的整数' });
      return;
    }
    const total = nums[0] + nums[1] + nums[2];

    const { data, error } = await client
      .from('scores')
      .upsert(
        {
          submission_id: submissionId,
          content: nums[0],
          expression: nums[1],
          poise: nums[2],
          total,
          best_star: !!best_star,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'submission_id' }
      )
      .select('id, submission_id, content, expression, poise, total, best_star, updated_at')
      .single();
    if (error) throw new Error(`保存打分失败: ${error.message}`);
    res.json({ score: data });
  } catch (e) {
    next(e);
  }
});

export default router;