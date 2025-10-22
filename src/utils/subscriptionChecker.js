const { SUBSCRIPTION_PLANS, PLAN_NAME_MAPPING, getSubscriptionPlan, hasFeatureAccess, getFeatureLimit, canCreateAppointment, canAddPractitioner, canAddClinic, canSendReminder, hasAnalyticsAccess, hasPatientPortalAccess, hasMultiClinicAccess, hasPrioritySupport } = require('./subscriptionFeatures');

// Subscription checking utilities for backend
class SubscriptionChecker {
  static getSubscriptionPlan(planName) {
    return getSubscriptionPlan(planName);
  }

  static hasFeatureAccess(planName, featureId) {
    return hasFeatureAccess(planName, featureId);
  }

  static getFeatureLimit(planName, featureId) {
    return getFeatureLimit(planName, featureId);
  }

  static canCreateAppointment(planName, currentAppointmentCount) {
    return canCreateAppointment(planName, currentAppointmentCount);
  }

  static canAddPractitioner(planName, currentPractitionerCount) {
    return canAddPractitioner(planName, currentPractitionerCount);
  }

  static canAddClinic(planName, currentClinicCount) {
    return canAddClinic(planName, currentClinicCount);
  }

  static canSendReminder(planName, currentReminderCount) {
    return canSendReminder(planName, currentReminderCount);
  }

  static hasAnalyticsAccess(planName) {
    return hasAnalyticsAccess(planName);
  }

  static hasPatientPortalAccess(planName) {
    return hasPatientPortalAccess(planName);
  }

  static hasMultiClinicAccess(planName) {
    return hasMultiClinicAccess(planName);
  }

  static hasPrioritySupport(planName) {
    return hasPrioritySupport(planName);
  }

  // Check if user can access a specific feature
  static checkFeatureAccess(planName, featureId) {
    const plan = this.getSubscriptionPlan(planName);
    if (!plan) {
      return {
        allowed: false,
        reason: 'Invalid subscription plan',
        upgradeRequired: true
      };
    }

    const feature = plan.features.find(f => f.id === featureId);
    if (!feature) {
      return {
        allowed: false,
        reason: 'Feature not available in current plan',
        upgradeRequired: true
      };
    }

    return {
      allowed: Boolean(feature.value),
      reason: feature.allowed ? 'Feature available' : 'Feature not included in current plan',
      upgradeRequired: !feature.allowed
    };
  }

  // Check appointment creation limits
  static checkAppointmentLimit(planName, currentCount) {
    const limit = this.getFeatureLimit(planName, 'appointments');
    const canCreate = this.canCreateAppointment(planName, currentCount);
    
    return {
      allowed: canCreate,
      currentCount,
      limit: limit === -1 ? 'unlimited' : limit,
      remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - currentCount),
      reason: canCreate ? 'Within appointment limit' : 'Appointment limit exceeded',
      upgradeRequired: !canCreate
    };
  }

  // Check practitioner limit
  static checkPractitionerLimit(planName, currentCount) {
    const limit = this.getFeatureLimit(planName, 'practitioners');
    const canAdd = this.canAddPractitioner(planName, currentCount);
    
    return {
      allowed: canAdd,
      currentCount,
      limit: limit === -1 ? 'unlimited' : limit,
      remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - currentCount),
      reason: canAdd ? 'Within practitioner limit' : 'Practitioner limit exceeded',
      upgradeRequired: !canAdd
    };
  }

  // Check clinic limit
  static checkClinicLimit(planName, currentCount) {
    const limit = this.getFeatureLimit(planName, 'clinics');
    const canAdd = this.canAddClinic(planName, currentCount);
    
    return {
      allowed: canAdd,
      currentCount,
      limit: limit === -1 ? 'unlimited' : limit,
      remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - currentCount),
      reason: canAdd ? 'Within clinic limit' : 'Clinic limit exceeded',
      upgradeRequired: !canAdd
    };
  }

  // Check reminder limit
  static checkReminderLimit(planName, currentCount) {
    const limit = this.getFeatureLimit(planName, 'reminders');
    const canSend = this.canSendReminder(planName, currentCount);
    
    return {
      allowed: canSend,
      currentCount,
      limit: limit === -1 ? 'unlimited' : limit,
      remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - currentCount),
      reason: canSend ? 'Within reminder limit' : 'Reminder limit exceeded',
      upgradeRequired: !canSend
    };
  }
}

module.exports = SubscriptionChecker;
