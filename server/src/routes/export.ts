import { Router } from 'express';
import * as XLSX from 'xlsx';
import { client } from '../db';
import { requireAuth, requireTeacher } from '../auth';
import { sortByStudentNo } from './submissions';

const router = Router();

/** 教师：导出当前任务打分记录为 Excel */
router.get('/tasks/:taskId/export', requireAuth(), requireTeacher(), async (req, res, next) => {
  try {
    const taskId = Number(req.params.taskId);

    const { data: task, error: tErr } = await client
      .from('tasks')
      .select('id, name')
      .eq('id', taskId)
      .maybeSingle();
    if (tErr) throw new Error(`查询任务失败: ${tErr.message}`);
    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }

    const { data, error } = await client
      .from('submissions')
      .select(
        'id, theme, students(student_no, name), scores(content, expression, poise, total, best_star, updated_at)'
      )
      .eq('task_id', taskId);
    if (error) throw new Error(`查询记录失败: ${error.message}`);

    const rows = sortByStudentNo(
      (data ?? []).map((r: any) => ({
        student_no: r.students?.student_no ?? '',
        name: r.students?.name ?? '',
        theme: r.theme,
        content: r.scores?.content ?? '',
        expression: r.scores?.expression ?? '',
        poise: r.scores?.poise ?? '',
        total: r.scores?.total ?? '',
        best_star: r.scores?.best_star ? '★' : '',
        scored_at: r.scores?.updated_at
          ? new Date(r.scores.updated_at).toLocaleString('zh-CN')
          : '',
      }))
    );

    const header = ['学号', '姓名', '申报主题', '任务名', '内容分', '表达分', '仪态分', '总分', '最佳星标', '打分时间'];
    const aoa = [
      header,
      ...rows.map((r) => [
        r.student_no,
        r.name,
        r.theme,
        task.name,
        r.content,
        r.expression,
        r.poise,
        r.total,
        r.best_star,
        r.scored_at,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 28 }, { wch: 24 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '打分记录');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const filename = encodeURIComponent(`${task.name}_打分记录.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
});

export default router;