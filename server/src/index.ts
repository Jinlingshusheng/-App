import express from "express";
import cors from "cors";
import { ensureTeacher } from "./auth";
import authRouter from "./routes/auth";
import rosterRouter from "./routes/roster";
import taskRouter from "./routes/tasks";
import submissionRouter from "./routes/submissions";
import scoreRouter from "./routes/scores";
import exportRouter from "./routes/export";
import parentRouter from "./routes/parent";

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