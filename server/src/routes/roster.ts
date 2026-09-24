import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { client } from '../db';
import { requireAuth, requireTeacher } from '../auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/** 解析粘贴文本：每行 "学号,姓名" 或 "学号 姓名"（支持逗号/中文逗号/制表符/空格分隔） */
function parseRosterText(text: string): { student_no: string; name: string }[] {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result: { student_no: string; name: string }[] = [];
  for (const line of lines) {
    const parts = line.split(/[,，、\t\s，]+/).filter(Boolean);
    if (parts.length >= 2) {
      result.push({ student_no: parts[0].trim(), name: parts[1].trim() });
    }
  }
  return result;
}

function isHeaderCell(v: string): boolean {
  return /学号|编号|序号|姓名|序号|学籍/.test(v);
}

/** 解析 Excel buffer：取前两列作为 学号、姓名，跳过表头 */
function parseRosterExcel(buffer: Buffer): { student_no: string; name: string }[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
  const result: { student_no: string; name: string }[] = [];
  for (const row of rows) {
    const a = String(row[0] ?? '').trim();
    const b = String(row[1] ?? '').trim();
    if (!a || !b) continue;
    if (rows.indexOf(row) === 0 && isHeaderCell(a)) continue;
    result.push({ student_no: a, name: b });
  }
  return result;
}

/** 合并写入名单（按学号 upsert） */
async function upsertRoster(rows: { student_no: string; name: string }[]) {
  if (rows.length === 0) return { added: 0, updated: 0 };
  const dbRows = rows.map((r) => ({ student_no: r.student_no, name: r.name }));
  const { data, error } = await client
    .from('students')
    .upsert(dbRows, { onConflict: 'student_no' })
    .select('id, student_no');
  if (error) throw new Error(`导入失败: ${error.message}`);
  return { added: data?.length ?? rows.length, updated: rows.length };
}

/** 教师：名单列表（按学号升序） */
router.get('/', requireAuth(), requireTeacher(), async (_req, res, next) => {
  try {
    const { data, error } = await client
      .from('students')
      .select('id, student_no, name, created_at')
      .order('student_no', { ascending: true });
    if (error) throw new Error(`查询名单失败: ${error.message}`);
    res.json({ students: data ?? [] });
  } catch (e) {
    next(e);
  }
});

/** 教师：粘贴文本导入 */
router.post('/import-text', requireAuth(), requireTeacher(), async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text) {
      res.status(400).json({ error: '请粘贴名单内容' });
      return;
    }
    const rows = parseRosterText(text);
    if (rows.length === 0) {
      res.status(400).json({ error: '未能解析出有效名单，请按“学号,姓名”每行一条' });
      return;
    }
    const stat = await upsertRoster(rows);
    res.json({ success: true, ...stat });
  } catch (e) {
    next(e);
  }
});

/** 教师：上传 Excel 导入 */
router.post('/import-file', requireAuth(), requireTeacher(), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传 Excel 文件' });
      return;
    }
    const rows = parseRosterExcel(req.file.buffer);
    if (rows.length === 0) {
      res.status(400).json({ error: '未能从文件中解析出名单，请检查格式' });
      return;
    }
    const stat = await upsertRoster(rows);
    res.json({ success: true, ...stat });
  } catch (e) {
    next(e);
  }
});

/** 教师：新增单个学生 */
router.post('/', requireAuth(), requireTeacher(), async (req, res, next) => {
  try {
    const { student_no, name } = req.body || {};
    if (!student_no || !name) {
      res.status(400).json({ error: '请填写学号和姓名' });
      return;
    }
    const { data, error } = await client
      .from('students')
      .insert({ student_no: String(student_no).trim(), name: String(name).trim() })
      .select('id, student_no, name')
      .maybeSingle();
    if (error) {
      if ((error as any).code === '23505') {
        res.status(400).json({ error: '该学号已存在' });
        return;
      }
      throw new Error(`新增失败: ${error.message}`);
    }
    res.status(201).json({ student: data });
  } catch (e) {
    next(e);
  }
});

/** 教师：更新学生 */
router.put('/:id', requireAuth(), requireTeacher(), async (req, res, next) => {
  try {
    const { student_no, name } = req.body || {};
    const id = Number(req.params.id);
    const patch: Record<string, string> = {};
    if (student_no) patch.student_no = String(student_no).trim();
    if (name) patch.name = String(name).trim();
    const { data, error } = await client
      .from('students')
      .update(patch)
      .eq('id', id)
      .select('id, student_no, name')
      .maybeSingle();
    if (error) throw new Error(`更新失败: ${error.message}`);
    if (!data) {
      res.status(404).json({ error: '学生不存在' });
      return;
    }
    res.json({ student: data });
  } catch (e) {
    next(e);
  }
});

/** 教师：删除单个学生 */
router.delete('/:id', requireAuth(), requireTeacher(), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { error } = await client.from('students').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

/** 教师：清空名单（谨慎操作，前端需二次确认） */
router.delete('/', requireAuth(), requireTeacher(), async (_req, res, next) => {
  try {
    const { error } = await client.from('students').delete().neq('id', 0);
    if (error) throw new Error(`清空名单失败: ${error.message}`);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;