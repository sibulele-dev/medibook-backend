import { relations } from "drizzle-orm/relations";
import { departments, admins, users, doctors, practices, subscriptionPayments, subscriptions, refunds, appointments, passwordHistory, payments, adminPermissions, permissions } from "./schema";

export const adminsRelations = relations(admins, ({one, many}) => ({
	department: one(departments, {
		fields: [admins.departmentId],
		references: [departments.id]
	}),
	user: one(users, {
		fields: [admins.id],
		references: [users.id]
	}),
	adminPermissions: many(adminPermissions),
}));

export const departmentsRelations = relations(departments, ({many}) => ({
	admins: many(admins),
}));

export const usersRelations = relations(users, ({many}) => ({
	admins: many(admins),
	doctors: many(doctors),
	passwordHistories: many(passwordHistory),
	payments: many(payments),
}));

export const doctorsRelations = relations(doctors, ({one, many}) => ({
	user: one(users, {
		fields: [doctors.id],
		references: [users.id]
	}),
	practice: one(practices, {
		fields: [doctors.practiceId],
		references: [practices.id]
	}),
	subscriptionPayments: many(subscriptionPayments),
	appointments: many(appointments),
	subscriptions: many(subscriptions),
}));

export const practicesRelations = relations(practices, ({many}) => ({
	doctors: many(doctors),
}));

export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({one, many}) => ({
	doctor: one(doctors, {
		fields: [subscriptionPayments.doctorId],
		references: [doctors.id]
	}),
	subscription: one(subscriptions, {
		fields: [subscriptionPayments.subscriptionId],
		references: [subscriptions.id]
	}),
	refunds: many(refunds),
}));

export const subscriptionsRelations = relations(subscriptions, ({one, many}) => ({
	subscriptionPayments: many(subscriptionPayments),
	doctor: one(doctors, {
		fields: [subscriptions.doctorId],
		references: [doctors.id]
	}),
}));

export const refundsRelations = relations(refunds, ({one}) => ({
	subscriptionPayment: one(subscriptionPayments, {
		fields: [refunds.paymentId],
		references: [subscriptionPayments.id]
	}),
}));

export const appointmentsRelations = relations(appointments, ({one}) => ({
	doctor: one(doctors, {
		fields: [appointments.doctorId],
		references: [doctors.id]
	}),
}));

export const passwordHistoryRelations = relations(passwordHistory, ({one}) => ({
	user: one(users, {
		fields: [passwordHistory.userId],
		references: [users.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	user: one(users, {
		fields: [payments.userId],
		references: [users.id]
	}),
}));

export const adminPermissionsRelations = relations(adminPermissions, ({one}) => ({
	admin: one(admins, {
		fields: [adminPermissions.adminId],
		references: [admins.id]
	}),
	permission: one(permissions, {
		fields: [adminPermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	adminPermissions: many(adminPermissions),
}));