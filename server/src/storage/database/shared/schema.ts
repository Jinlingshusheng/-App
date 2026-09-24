import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, index, serial, uniqueIndex } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户（教师/家长）：账号采用自定义用户名 + 密码（scrypt 哈希存储）
export const users = pgTable(
	"users",
	{
		id: serial().primaryKey(),
		username: varchar("username", { length: 64 }).notNull().unique(),
		password_hash: text("password_hash").notNull(),
		role: varchar("role", { length: 20 }).notNull().default("parent"),
		name: varchar("name", { length: 64 }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("users_username_idx").on(table.username)]
);

// 登录会话（多设备：每次登录生成一条）
export const sessions = pgTable(
	"sessions",
	{
		id: serial().primaryKey(),
		user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		token: varchar("token", { length: 128 }).notNull().unique(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("sessions_user_id_idx").on(table.user_id),
		index("sessions_token_idx").on(table.token),
	]
);

// 班级学生名单
export const students = pgTable(
	"students",
	{
		id: serial().primaryKey(),
		student_no: varchar("student_no", { length: 32 }).notNull().unique(),
		name: varchar("name", { length: 64 }).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("students_student_no_idx").on(table.student_no),
	]
);

// 家长与孩子的绑定（一个家长账号绑定一个孩子，同一孩子允许多位家长）
export const parentBindings = pgTable(
	"parent_bindings",
	{
		id: serial().primaryKey(),
		user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
		student_id: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("parent_bindings_user_id_idx").on(table.user_id),
		index("parent_bindings_student_id_idx").on(table.student_id),
	]
);

// 展示任务
export const tasks = pgTable(
	"tasks",
	{
		id: serial().primaryKey(),
		name: varchar("name", { length: 200 }).notNull(),
		description: text("description"),
		requirement: text("requirement"),
		is_active: boolean("is_active").default(true).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("tasks_is_active_idx").on(table.is_active)]
);

// 主题申报：每个学生在每个任务只能申报一次；主题在同一任务内唯一
export const submissions = pgTable(
	"submissions",
	{
		id: serial().primaryKey(),
		task_id: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
		student_id: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
		theme: varchar("theme", { length: 300 }).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("submissions_task_id_idx").on(table.task_id),
		index("submissions_student_id_idx").on(table.student_id),
		uniqueIndex("submissions_task_student_unique").on(table.task_id, table.student_id),
		uniqueIndex("submissions_task_theme_unique").on(table.task_id, table.theme),
	]
);

// 打分：每个申报对应一条分数（内容/表达/仪态 1-10，总分自动合计，另有独立最佳星标）
export const scores = pgTable(
	"scores",
	{
		id: serial().primaryKey(),
		submission_id: integer("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }).unique(),
		content: integer("content"),
		expression: integer("expression"),
		poise: integer("poise"),
		total: integer("total"),
		best_star: boolean("best_star").default(false).notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("scores_submission_id_idx").on(table.submission_id),
	]
);