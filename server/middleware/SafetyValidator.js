/**
 * Critical Safety Validator - Prevents Catastrophic Errors
 * Implements 80/20 rule: 20% of validation prevents 80% of disasters
 */

class SafetyValidator {
  constructor() {
    this.criticalLimits = {
      maxQuoteAmount: 2000000,     // $2M - flag for manual review
      maxUserCount: 5000,          // 5K users - reasonable upper limit
      maxSiteCount: 50,            // 50 sites - reasonable upper limit
      minMarginThreshold: 0.15,    // 15% minimum margin
      maxPricePerUser: 10000,      // $10K per user - clearly wrong
      minPricePerUser: 200         // $200 per user - suspiciously low
    };

    this.alertThresholds = {
      highValue: 100000,           // $100K+ quotes need attention
      suspiciouslyLow: 5000,       // <$5K for multi-site seems wrong
      rapidFireQuotes: 10          // >10 quotes in 10 minutes
    };
  }

  // CRITICAL: Prevent catastrophic pricing errors
  validateQuoteBeforeCreation(quoteData) {
    const errors = [];
    const warnings = [];

    // CRITICAL CHECK 1: Detect obviously wrong calculations
    if (quoteData.totalAmount > this.criticalLimits.maxQuoteAmount) {
      errors.push({
        type: 'CRITICAL_AMOUNT_EXCEEDED',
        message: `Quote amount $${quoteData.totalAmount.toLocaleString()} exceeds $2M limit - likely calculation error`,
        severity: 'STOP_PROCESSING',
        action: 'REQUIRE_MANUAL_REVIEW'
      });
    }

    // CRITICAL CHECK 2: Detect impossible user counts
    if (quoteData.userCount > this.criticalLimits.maxUserCount) {
      errors.push({
        type: 'IMPOSSIBLE_USER_COUNT',
        message: `${quoteData.userCount} users exceeds reasonable limit of ${this.criticalLimits.maxUserCount}`,
        severity: 'STOP_PROCESSING',
        action: 'VERIFY_INPUT'
      });
    }

    // CRITICAL CHECK 3: Price per user sanity check
    const pricePerUser = quoteData.totalAmount / quoteData.userCount;

    if (pricePerUser > this.criticalLimits.maxPricePerUser) {
      errors.push({
        type: 'PRICE_PER_USER_TOO_HIGH',
        message: `$${pricePerUser.toFixed(2)} per user exceeds $${this.criticalLimits.maxPricePerUser} - likely error`,
        severity: 'STOP_PROCESSING',
        calculation: `$${quoteData.totalAmount} ÷ ${quoteData.userCount} users`
      });
    }

    if (pricePerUser < this.criticalLimits.minPricePerUser) {
      errors.push({
        type: 'PRICE_PER_USER_TOO_LOW',
        message: `$${pricePerUser.toFixed(2)} per user below $${this.criticalLimits.minPricePerUser} - suspiciously low`,
        severity: 'STOP_PROCESSING',
        calculation: `$${quoteData.totalAmount} ÷ ${quoteData.userCount} users`
      });
    }

    // CRITICAL CHECK 4: Multi-site system validation
    if (quoteData.isMultiSite && quoteData.siteCount > 1) {
      const conventionalSystems = ['Conventional', 'Basic'];

      if (conventionalSystems.includes(quoteData.systemType)) {
        errors.push({
          type: 'WRONG_SYSTEM_FOR_MULTISITE',
          message: `${quoteData.systemType} system cannot handle ${quoteData.siteCount} sites with inter-site communication`,
          severity: 'STOP_PROCESSING',
          recommendation: 'Use IP Site Connect, Linked Capacity Plus, or Capacity Max'
        });
      }

      // Validate system capacity
      if (quoteData.systemType === 'IP Site Connect' && quoteData.userCount > 250) {
        errors.push({
          type: 'SYSTEM_CAPACITY_EXCEEDED',
          message: `IP Site Connect max capacity is 250 users, quote has ${quoteData.userCount}`,
          severity: 'STOP_PROCESSING',
          recommendation: 'Use Linked Capacity Plus for 251-1500 users'
        });
      }
    }

    // WARNING CHECK 1: High-value quotes need attention
    if (quoteData.totalAmount > this.alertThresholds.highValue) {
      warnings.push({
        type: 'HIGH_VALUE_QUOTE',
        message: `High-value quote: $${quoteData.totalAmount.toLocaleString()}`,
        severity: 'ATTENTION_NEEDED',
        action: 'NOTIFY_MANAGER'
      });
    }

    // WARNING CHECK 2: Suspiciously low multi-site quotes
    if (quoteData.isMultiSite && quoteData.totalAmount < this.alertThresholds.suspiciouslyLow) {
      warnings.push({
        type: 'SUSPICIOUSLY_LOW_MULTISITE',
        message: `Multi-site quote under $5K seems too low`,
        severity: 'VERIFY_CALCULATION',
        details: `${quoteData.siteCount} sites, ${quoteData.userCount} users`
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      requiresReview: errors.some(e => e.action === 'REQUIRE_MANUAL_REVIEW') ||
                     warnings.some(w => w.action === 'NOTIFY_MANAGER')
    };
  }

  // CRITICAL: Log all validation events for audit trail
  logValidationEvent(sessionId, quoteData, validationResult) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      quoteAmount: quoteData.totalAmount,
      userCount: quoteData.userCount,
      systemType: quoteData.systemType,
      isValid: validationResult.isValid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length,
      requiresReview: validationResult.requiresReview,
      errors: validationResult.errors.map(e => e.type),
      warnings: validationResult.warnings.map(w => w.type)
    };

    // In production, send to logging service
    console.log('VALIDATION_EVENT:', JSON.stringify(logEntry, null, 2));

    // Also write to local audit file
    const fs = require('fs');
    const logFile = './audit/validation.log';

    try {
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write audit log:', error.message);
    }

    return logEntry;
  }

  // CRITICAL: Send alerts for high-risk situations
  async sendAlertIfNeeded(validationResult, quoteData) {
    const criticalErrors = validationResult.errors.filter(e =>
      e.severity === 'STOP_PROCESSING'
    );

    if (criticalErrors.length > 0) {
      const alertMessage = `🚨 CRITICAL QUOTE ERROR PREVENTED
Quote Amount: $${quoteData.totalAmount.toLocaleString()}
Users: ${quoteData.userCount}
System: ${quoteData.systemType}
Errors: ${criticalErrors.map(e => e.message).join(', ')}
Time: ${new Date().toISOString()}`;

      // Send to multiple channels for redundancy
      await this.sendSlackAlert(alertMessage);
      await this.sendEmailAlert(alertMessage);
      await this.logCriticalEvent(alertMessage);
    }

    if (validationResult.requiresReview) {
      const reviewMessage = `📋 Quote Requires Manager Review
Amount: $${quoteData.totalAmount.toLocaleString()}
Users: ${quoteData.userCount}
Reason: High value or unusual parameters`;

      await this.sendManagerNotification(reviewMessage);
    }
  }

  async sendSlackAlert(message) {
    // TODO: Implement Slack webhook
    console.log('SLACK ALERT:', message);
  }

  async sendEmailAlert(message) {
    // TODO: Implement email notification
    console.log('EMAIL ALERT:', message);
  }

  async sendManagerNotification(message) {
    // TODO: Implement manager notification
    console.log('MANAGER NOTIFICATION:', message);
  }

  async logCriticalEvent(message) {
    const fs = require('fs');
    const criticalLog = './audit/critical_events.log';

    try {
      const entry = `${new Date().toISOString()}: ${message}\n`;
      fs.appendFileSync(criticalLog, entry);
    } catch (error) {
      console.error('Failed to log critical event:', error.message);
    }
  }
}

module.exports = SafetyValidator;