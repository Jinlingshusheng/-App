import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { ensureTeacher } from "./auth";
import authRouter from "./routes/auth";
import rosterRouter from "./routes/roster";
import taskRouter from "./routes/tasks";
import submissionRouter from "./routes/submissions";
import scoreRouter from "./routes/scores";
import exportRouter from "./routes/export";
import parentRouter from "./routes/parent";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 健康检查
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 业务路由
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/students', rosterRouter);
app.use('/api/v1/tasks', taskRouter);
app.use('/api/v1', submissionRouter);   // /tasks/:taskId/submissions, /submissions/:id/score
app.use('/api/v1', scoreRouter);
app.use('/api/v1', exportRouter);       // /tasks/:taskId/export
app.use('/api/v1', parentRouter);       // /me/overview

// ===== 生产环境托管前端 H5 页面 =====
// 生产构建会把 Expo Web 产物导出到 server/public，这里负责静态托管 + SPA 回退。
// 若无该目录（本地开发走 expo dev server），则跳过，不影响 API。
const publicDir = path.join(__dirname, '..', 'public');
const indexPath = path.join(publicDir, 'index.html');
if (fs.existsSync(indexPath)) {
  app.use(express.static(publicDir));
  // SPA fallback：非 API 的请求回退到 index.html，支持刷新与深链
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexPath);
  });
  console.log('[static] 已托管前端 H5 页面');
}

// 统一错误处理
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('API Error:', err?.message || err);
  res.status(500).json({ error: err?.message || '服务器内部错误' });
});

// 启动：确保预置教师账号存在后再监听
ensureTeacher()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}/`);
    });
  })
  .catch((e) => {
    console.error('初始化失败:', e?.message || e);
    process.exit(1);
  });

export default app;