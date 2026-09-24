import { Platform } from 'react-native';

/**
 * 前端 API 客户端
 * 服务端地址由运行时注入的 EXPO_PUBLIC_BACKEND_BASE_URL 提供，禁止兜底逻辑。
 */
export const API_BASE = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  token?: string | null;
  body?: unknown;
  formData?: FormData;
}

async function request<T = any>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
  let payload: string | FormData | undefined;
  if (options.formData) {
    payload = options.formData; // 不手动设置 Content-Type
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  if (!res.ok) {
    let msg = `请求失败(${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  return res as any as T;
}

/** 触发浏览器下载（Web）。移动端提示在浏览器中使用。 */
export async function downloadBlob(res: Response, fallbackName: string): Promise<void> {
  if (Platform.OS !== 'web') {
    alert('请在电脑或手机浏览器中打开此页面下载 Excel 文件');
    return;
  }
  const blob = await res.blob();
  let fileName = fallbackName;
  const cd = res.headers.get('content-disposition') || '';
  const m = cd.match(/filename\*=UTF-8''([^;]+)/);
  if (m) {
    try {
      fileName = decodeURIComponent(m[1]);
    } catch {
      fileName = fallbackName;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  // 认证
  login: (body: { username: string; password: string }) =>
    request<{ token: string; user: any }>('POST', '/auth/login', { body }),
  register: (body: {
    username: string;
    password: string;
    name: string;
    student_no: string;
    student_name: string;
  }) => request<{ token: string; user: any; bound_student: any }>('POST', '/auth/register', { body }),
  logout: (token: string | null) => request('POST', '/auth/logout', { token }),
  changePassword: (token: string | null, body: { old_password: string; new_password: string }) =>
    request('POST', '/auth/change-password', { token, body }),

  // 名单
  getStudents: (token: string | null) =>
    request<{ students: any[] }>('GET', '/students', { token }),
  addStudent: (token: string | null, body: { student_no: string; name: string }) =>
    request('POST', '/students', { token, body }),
  updateStudent: (token: string | null, id: number, body: { student_no: string; name: string }) =>
    request('PUT', `/students/${id}`, { token, body }),
  deleteStudent: (token: string | null, id: number) =>
    request('DELETE', `/students/${id}`, { token }),
  importText: (token: string | null, text: string) =>
    request('POST', '/students/import-text', { token, body: { text } }),
  importFile: (token: string | null, formData: FormData) =>
    request('POST', '/students/import-file', { token, formData }),
  clearStudents: (token: string | null) => request('DELETE', '/students', { token }),

  // 任务
  getTasks: (token: string | null) => request<{ tasks: any[] }>('GET', '/tasks', { token }),
  getActiveTask: (token: string | null) => request<{ task: any | null }>('GET', '/tasks/active', { token }),
  createTask: (token: string | null, body: any) => request('POST', '/tasks', { token, body }),
  updateTask: (token: string | null, id: number, body: any) => request('PUT', `/tasks/${id}`, { token, body }),
  deleteTask: (token: string | null, id: number) => request('DELETE', `/tasks/${id}`, { token }),

  // 申报 / 记录
  getSubmissions: (token: string | null, taskId: number) =>
    request<{ submissions: any[] }>('GET', `/tasks/${taskId}/submissions`, { token }),
  applyTheme: (token: string | null, taskId: number, body: {
    student_no: string;
    student_name: string;
    theme: string;
  }) => request('POST', `/tasks/${taskId}/submissions`, { token, body }),
  scoreSubmission: (token: string | null, submissionId: number, body: {
    content: number;
    expression: number;
    poise: number;
    best_star: boolean;
  }) => request('POST', `/submissions/${submissionId}/score`, { token, body }),

  // 导出
  exportTask: (token: string | null, taskId: number, taskName: string) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}/tasks/${taskId}/export`, { headers });
  },

  // 家长概览
  getOverview: (token: string | null) =>
    request<any>('GET', '/me/overview', { token }),
};

/** 获取分享链接 / 文案（基于当前页面地址） */
export function getShareInfo() {
  let origin = '';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    origin = window.location.origin;
  }
  const link = `${origin}/?role=parent`;
  const copy = `「星辰中队」课前三分钟智慧应用平台已上线~\n请家长点击链接，注册登录后为孩子申报展示主题：\n${link}\n（在家校微信群/QQ群内转发即可，手机电脑均可打开）`;
  return { link, copy };
}