import { pgTable, text, unique, boolean, timestamp, foreignKey, integer, serial, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const departmentName = pgEnum("department_name", ['super_admin', 'onboarding', 'sales', 'support', 'billing_accounts', 'compliance'])
export const departmentPrivilege = pgEnum("department_privilege", ['full_access', 'manage_departments', 'manage_practices', 'manage_doctors', 'create_remove_users', 'access_audit_trails', 'add_practices', 'add_doctors', 'verify_doctor_details', 'approve_numbers', 'invite_users', 'manage_demo_bookings', 'view_adoption_funnel', 'communicate_potential_users', 'access_analytics', 'help_technical_issues', 'reset_doctor_access', 'monitor_sessions', 'manage_subscriptions', 'view_update_billing', 'send_invoices', 'verify_credentials', 'approve_hpcsa_bhf', 'manage_document_verification'])
export const paymentStatus = pgEnum("payment_status", ['success', 'failed', 'refunded'])
export const practiceStatus = pgEnum("practice_status", ['active', 'inactive', 'pending'])
export const refundStatus = pgEnum("refund_status", ['pending', 'success', 'failed'])
export const subscriptionStatus = pgEnum("subscription_status", ['active', 'canceled', 'refunded', 'expired'])
export const userRole = pgEnum("user_role", ['doctor', 'admin'])


export const departments = pgTable("departments", {
	id: text().primaryKey().notNull(),
	name: departmentName().notNull(),
	privileges: departmentPrivilege().array().notNull(),
});

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	role: userRole().notNull(),
	phone: text(),
	isActive: boolean("is_active").default(true).notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	passwordHash: text("password_hash").notNull(),
	lastLoggedInAt: timestamp("last_logged_in_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const practices = pgTable("practices", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	address: text().notNull(),
	city: text(),
	province: text(),
	zip: text(),
	country: text(),
	phone: text().notNull(),
	practiceContact: text("practice_contact"),
	practiceNumber: text("practice_number").notNull(),
	status: practiceStatus().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const admins = pgTable("admins", {
	id: text().primaryKey().notNull(),
	departmentId: text("department_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "admins_department_id_departments_id_fk"
		}),
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "admins_id_users_id_fk"
		}),
]);

export const permissions = pgTable("permissions", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
});

export const doctors = pgTable("doctors", {
	id: text().primaryKey().notNull(),
	practiceId: text("practice_id").notNull(),
	specialty: text().notNull(),
	bio: text(),
	qualifications: text(),
	hpcsa: text(),
	experience: integer(),
	languages: text(),
	telehealth: boolean().default(false).notNull(),
	status: text().default('pending').notNull(),
	profilePicUrl: text("profile_pic_url"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "doctors_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.practiceId],
			foreignColumns: [practices.id],
			name: "doctors_practice_id_practices_id_fk"
		}),
]);

export const subscriptionPayments = pgTable("subscription_payments", {
	id: text().primaryKey().notNull(),
	doctorId: text("doctor_id").notNull(),
	subscriptionId: text("subscription_id").notNull(),
	amount: integer().notNull(),
	currency: text().default('ZAR').notNull(),
	paymentStatus: paymentStatus("payment_status"),
	transactionId: text("transaction_id").notNull(),
	invoiceUrl: text("invoice_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctors.id],
			name: "subscription_payments_doctor_id_doctors_id_fk"
		}),
	foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [subscriptions.id],
			name: "subscription_payments_subscription_id_subscriptions_id_fk"
		}),
]);

export const refunds = pgTable("refunds", {
	id: text().primaryKey().notNull(),
	paymentId: text("payment_id").notNull(),
	refundStatus: refundStatus("refund_status"),
	refundReason: text("refund_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [subscriptionPayments.id],
			name: "refunds_payment_id_subscription_payments_id_fk"
		}),
]);

export const appointments = pgTable("appointments", {
	id: text().primaryKey().notNull(),
	patientName: text("patient_name").notNull(),
	patientEmail: text("patient_email"),
	patientPhone: text("patient_phone").notNull(),
	doctorId: text("doctor_id").notNull(),
	practiceId: text("practice_id"),
	date: text().notNull(),
	time: text().notNull(),
	note: text(),
	status: text().default('scheduled').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctors.id],
			name: "appointments_doctor_id_doctors_id_fk"
		}),
]);

export const subscriptions = pgTable("subscriptions", {
	id: text().primaryKey().notNull(),
	doctorId: text("doctor_id").notNull(),
	planName: text("plan_name").default('Standard').notNull(),
	amount: integer().default(600).notNull(),
	status: subscriptionStatus(),
	startDate: timestamp("start_date", { mode: 'string' }),
	nextBillingDate: timestamp("next_billing_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctors.id],
			name: "subscriptions_doctor_id_doctors_id_fk"
		}),
]);

export const passwordHistory = pgTable("password_history", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	passwordHash: text("password_hash").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_history_user_id_users_id_fk"
		}),
]);

export const payments = pgTable("payments", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id"),
	pfPaymentId: text("pf_payment_id"),
	amount: integer().notNull(),
	status: text().default('pending').notNull(),
	itemName: text("item_name").notNull(),
	itemDescription: text("item_description"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payments_user_id_users_id_fk"
		}),
]);

export const adminPermissions = pgTable("admin_permissions", {
	adminId: text("admin_id").notNull(),
	permissionId: text("permission_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admins.id],
			name: "admin_permissions_admin_id_admins_id_fk"
		}),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "admin_permissions_permission_id_permissions_id_fk"
		}),
	primaryKey({ columns: [table.adminId, table.permissionId], name: "admin_permissions_admin_id_permission_id_pk"}),
]);
