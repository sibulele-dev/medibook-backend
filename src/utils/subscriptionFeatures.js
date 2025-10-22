// Subscription feature definitions and utilities for backend
const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 400,
    features: [
      { id: 'practitioners', name: 'Practitioners', description: 'Number of practitioners', type: 'limit', value: 1 },
      { id: 'appointments', name: 'Appointments', description: 'Monthly appointment limit', type: 'limit', value: 300 },
      { id: 'reminders', name: 'Reminders', description: 'Monthly reminder limit', type: 'limit', value: 200 },
      { id: 'popia', name: 'POPIA Compliance', description: 'Data protection compliance', type: 'boolean', value: true },
      { id: 'email_support', name: 'Email Support', description: 'Basic email support', type: 'boolean', value: true },
    ],
    limits: {
      practitioners: 1,
      appointments: 300,
      reminders: 200,
      clinics: 1,
    },
    includes: {
      analytics: false,
      patientPortal: false,
      multiClinic: false,
      prioritySupport: false,
      customOnboarding: false,
      dedicatedManager: false,
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 700,
    features: [
      { id: 'practitioners', name: 'Practitioners', description: 'Number of practitioners', type: 'limit', value: 5 },
      { id: 'appointments', name: 'Appointments', description: 'Unlimited appointments', type: 'limit', value: -1 },
      { id: 'reminders', name: 'Reminders', description: 'Unlimited reminders', type: 'limit', value: -1 },
      { id: 'clinics', name: 'Multi-clinic', description: 'Up to 3 clinic locations', type: 'limit', value: 3 },
      { id: 'analytics', name: 'Analytics', description: 'Advanced analytics dashboard', type: 'boolean', value: true },
      { id: 'patient_portal', name: 'Patient Portal', description: 'Patient self-service portal', type: 'boolean', value: true },
      { id: 'priority_support', name: 'Priority Support', description: 'Priority customer support', type: 'boolean', value: true },
    ],
    limits: {
      practitioners: 5,
      appointments: -1, // unlimited
      reminders: -1, // unlimited
      clinics: 3,
    },
    includes: {
      analytics: true,
      patientPortal: true,
      multiClinic: true,
      prioritySupport: true,
      customOnboarding: false,
      dedicatedManager: false,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0, // Custom pricing
    features: [
      { id: 'practitioners', name: 'Practitioners', description: 'Unlimited practitioners', type: 'limit', value: -1 },
      { id: 'appointments', name: 'Appointments', description: 'Unlimited appointments', type: 'limit', value: -1 },
      { id: 'reminders', name: 'Reminders', description: 'Unlimited reminders', type: 'limit', value: -1 },
      { id: 'clinics', name: 'Clinics', description: 'Unlimited clinic locations', type: 'limit', value: -1 },
      { id: 'analytics', name: 'Advanced Analytics', description: 'Advanced reporting & integrations', type: 'boolean', value: true },
      { id: 'patient_portal', name: 'Patient Portal', description: 'Full patient portal access', type: 'boolean', value: true },
      { id: 'dedicated_manager', name: 'Dedicated Manager', description: 'Dedicated account manager', type: 'boolean', value: true },
      { id: 'custom_onboarding', name: 'Custom Onboarding', description: 'Custom onboarding & training', type: 'boolean', value: true },
      { id: 'priority_support', name: '24/7 Support', description: '24/7 dedicated support', type: 'boolean', value: true },
    ],
    limits: {
      practitioners: -1, // unlimited
      appointments: -1, // unlimited
      reminders: -1, // unlimited
      clinics: -1, // unlimited
    },
    includes: {
      analytics: true,
      patientPortal: true,
      multiClinic: true,
      prioritySupport: true,
      customOnboarding: true,
      dedicatedManager: true,
    },
  },
};

// Map plan names from database to our plan definitions
const PLAN_NAME_MAPPING = {
  'Standard': 'starter',
  'Starter': 'starter',
  'Professional': 'professional',
  'Enterprise': 'enterprise',
};

function getSubscriptionPlan(planName) {
  const normalizedPlanName = PLAN_NAME_MAPPING[planName] || planName.toLowerCase();
  return SUBSCRIPTION_PLANS[normalizedPlanName] || null;
}

function hasFeatureAccess(planName, featureId) {
  const plan = getSubscriptionPlan(planName);
  if (!plan) return false;
  
  const feature = plan.features.find(f => f.id === featureId);
  return feature ? Boolean(feature.value) : false;
}

function getFeatureLimit(planName, featureId) {
  const plan = getSubscriptionPlan(planName);
  if (!plan) return 0;
  
  const feature = plan.features.find(f => f.id === featureId);
  return feature && typeof feature.value === 'number' ? feature.value : 0;
}

function canCreateAppointment(planName, currentAppointmentCount) {
  const limit = getFeatureLimit(planName, 'appointments');
  if (limit === -1) return true; // unlimited
  return currentAppointmentCount < limit;
}

function canAddPractitioner(planName, currentPractitionerCount) {
  const limit = getFeatureLimit(planName, 'practitioners');
  if (limit === -1) return true; // unlimited
  return currentPractitionerCount < limit;
}

function canAddClinic(planName, currentClinicCount) {
  const limit = getFeatureLimit(planName, 'clinics');
  if (limit === -1) return true; // unlimited
  return currentClinicCount < limit;
}

function canSendReminder(planName, currentReminderCount) {
  const limit = getFeatureLimit(planName, 'reminders');
  if (limit === -1) return true; // unlimited
  return currentReminderCount < limit;
}

function hasAnalyticsAccess(planName) {
  const plan = getSubscriptionPlan(planName);
  return plan ? plan.includes.analytics : false;
}

function hasPatientPortalAccess(planName) {
  const plan = getSubscriptionPlan(planName);
  return plan ? plan.includes.patientPortal : false;
}

function hasMultiClinicAccess(planName) {
  const plan = getSubscriptionPlan(planName);
  return plan ? plan.includes.multiClinic : false;
}

function hasPrioritySupport(planName) {
  const plan = getSubscriptionPlan(planName);
  return plan ? plan.includes.prioritySupport : false;
}

module.exports = {
  SUBSCRIPTION_PLANS,
  PLAN_NAME_MAPPING,
  getSubscriptionPlan,
  hasFeatureAccess,
  getFeatureLimit,
  canCreateAppointment,
  canAddPractitioner,
  canAddClinic,
  canSendReminder,
  hasAnalyticsAccess,
  hasPatientPortalAccess,
  hasMultiClinicAccess,
  hasPrioritySupport,
};
