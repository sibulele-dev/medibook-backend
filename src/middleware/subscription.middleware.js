const SubscriptionChecker = require('../utils/subscriptionChecker');
const subscriptionService = require('../services/subscription.service');

// Middleware to check subscription limits and features
class SubscriptionMiddleware {
  // Check if user can create appointments based on their subscription
  static async checkAppointmentLimit(req, res, next) {
    try {
      const doctorId = req.user?.id || req.body?.doctorId;
      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Doctor ID is required'
        });
      }

      // Get user's subscription
      const subscription = await subscriptionService.getSubscriptionByDoctorId(doctorId);
      if (!subscription || subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required to create appointments',
          upgradeRequired: true
        });
      }

      // Get current appointment count for this month
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // This would need to be implemented in appointment service
      const appointmentCount = await subscriptionService.getAppointmentCountForPeriod(
        doctorId, 
        startOfMonth, 
        endOfMonth
      );

      const limitCheck = SubscriptionChecker.checkAppointmentLimit(
        subscription.planName, 
        appointmentCount
      );

      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: limitCheck.reason,
          upgradeRequired: limitCheck.upgradeRequired,
          limitInfo: {
            current: limitCheck.currentCount,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining
          }
        });
      }

      // Add limit info to request for use in the controller
      req.subscriptionLimits = limitCheck;
      next();
    } catch (error) {
      console.error('Error checking appointment limit:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking subscription limits'
      });
    }
  }

  // Check if user can add practitioners
  static async checkPractitionerLimit(req, res, next) {
    try {
      const doctorId = req.user?.id || req.body?.doctorId;
      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Doctor ID is required'
        });
      }

      const subscription = await subscriptionService.getSubscriptionByDoctorId(doctorId);
      if (!subscription || subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required',
          upgradeRequired: true
        });
      }

      // Get current practitioner count for this practice
      const practitionerCount = await subscriptionService.getPractitionerCount(doctorId);
      
      const limitCheck = SubscriptionChecker.checkPractitionerLimit(
        subscription.planName, 
        practitionerCount
      );

      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: limitCheck.reason,
          upgradeRequired: limitCheck.upgradeRequired,
          limitInfo: {
            current: limitCheck.currentCount,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining
          }
        });
      }

      req.subscriptionLimits = limitCheck;
      next();
    } catch (error) {
      console.error('Error checking practitioner limit:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking subscription limits'
      });
    }
  }

  // Check if user can access analytics features
  static async checkAnalyticsAccess(req, res, next) {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const subscription = await subscriptionService.getSubscriptionByDoctorId(doctorId);
      if (!subscription || subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required',
          upgradeRequired: true
        });
      }

      const hasAccess = SubscriptionChecker.hasAnalyticsAccess(subscription.planName);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Analytics features require Professional or Enterprise subscription',
          upgradeRequired: true,
          requiredPlan: 'Professional'
        });
      }

      next();
    } catch (error) {
      console.error('Error checking analytics access:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking subscription access'
      });
    }
  }

  // Check if user can access patient portal features
  static async checkPatientPortalAccess(req, res, next) {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const subscription = await subscriptionService.getSubscriptionByDoctorId(doctorId);
      if (!subscription || subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required',
          upgradeRequired: true
        });
      }

      const hasAccess = SubscriptionChecker.hasPatientPortalAccess(subscription.planName);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Patient portal features require Professional or Enterprise subscription',
          upgradeRequired: true,
          requiredPlan: 'Professional'
        });
      }

      next();
    } catch (error) {
      console.error('Error checking patient portal access:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking subscription access'
      });
    }
  }

  // Check if user can add clinics
  static async checkClinicLimit(req, res, next) {
    try {
      const doctorId = req.user?.id || req.body?.doctorId;
      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Doctor ID is required'
        });
      }

      const subscription = await subscriptionService.getSubscriptionByDoctorId(doctorId);
      if (!subscription || subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required',
          upgradeRequired: true
        });
      }

      const clinicCount = await subscriptionService.getClinicCount(doctorId);
      
      const limitCheck = SubscriptionChecker.checkClinicLimit(
        subscription.planName, 
        clinicCount
      );

      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: limitCheck.reason,
          upgradeRequired: limitCheck.upgradeRequired,
          limitInfo: {
            current: limitCheck.currentCount,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining
          }
        });
      }

      req.subscriptionLimits = limitCheck;
      next();
    } catch (error) {
      console.error('Error checking clinic limit:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking subscription limits'
      });
    }
  }

  // Check if user can send reminders
  static async checkReminderLimit(req, res, next) {
    try {
      const doctorId = req.user?.id || req.body?.doctorId;
      if (!doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Doctor ID is required'
        });
      }

      const subscription = await subscriptionService.getSubscriptionByDoctorId(doctorId);
      if (!subscription || subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required',
          upgradeRequired: true
        });
      }

      // Get current reminder count for this month
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const reminderCount = await subscriptionService.getReminderCountForPeriod(
        doctorId, 
        startOfMonth, 
        endOfMonth
      );
      
      const limitCheck = SubscriptionChecker.checkReminderLimit(
        subscription.planName, 
        reminderCount
      );

      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: limitCheck.reason,
          upgradeRequired: limitCheck.upgradeRequired,
          limitInfo: {
            current: limitCheck.currentCount,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining
          }
        });
      }

      req.subscriptionLimits = limitCheck;
      next();
    } catch (error) {
      console.error('Error checking reminder limit:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking subscription limits'
      });
    }
  }
}

module.exports = SubscriptionMiddleware;
