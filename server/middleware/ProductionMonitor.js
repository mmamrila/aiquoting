/**
 * Production Monitoring System
 * Essential monitoring for deployment readiness
 */

class ProductionMonitor {
  constructor() {
    this.metrics = {
      quotesGenerated: 0,
      errors: 0,
      warnings: 0,
      averageResponseTime: 0,
      highValueQuotes: 0,
      validationFailures: 0
    };

    this.startTime = Date.now();
    this.recentQuotes = [];
    this.maxRecentQuotes = 100; // Keep last 100 quotes for analysis

    // Start periodic reporting
    setInterval(() => this.generatePeriodicReport(), 300000); // Every 5 minutes
  }

  // Track quote generation
  trackQuoteGenerated(quoteData, responseTime) {
    this.metrics.quotesGenerated++;
    this.updateAverageResponseTime(responseTime);

    if (quoteData.totalAmount > 100000) {
      this.metrics.highValueQuotes++;
    }

    // Store recent quote data
    this.recentQuotes.push({
      timestamp: Date.now(),
      amount: quoteData.totalAmount,
      userCount: quoteData.userCount,
      systemType: quoteData.systemType,
      responseTime: responseTime,
      isMultiSite: quoteData.isMultiSite
    });

    // Keep only recent quotes
    if (this.recentQuotes.length > this.maxRecentQuotes) {
      this.recentQuotes.shift();
    }

    // Check for rapid-fire quote generation (potential issue)
    this.checkRapidFireQuotes();
  }

  // Track validation failures
  trackValidationFailure(severity, error) {
    this.metrics.validationFailures++;

    if (severity === 'CRITICAL' || severity === 'STOP_PROCESSING') {
      this.metrics.errors++;
      this.sendCriticalAlert(`Validation failure: ${error}`);
    } else {
      this.metrics.warnings++;
    }
  }

  // Track system errors
  trackSystemError(error, context) {
    this.metrics.errors++;

    const errorData = {
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      context: context
    };

    console.error('SYSTEM_ERROR:', errorData);
    this.logToFile('system_errors.log', errorData);

    // Send immediate alert for system errors
    this.sendCriticalAlert(`System error: ${error.message}`);
  }

  // Update average response time
  updateAverageResponseTime(newTime) {
    const alpha = 0.1; // Exponential moving average factor
    this.metrics.averageResponseTime =
      (alpha * newTime) + ((1 - alpha) * this.metrics.averageResponseTime);
  }

  // Check for suspicious rapid-fire quote generation
  checkRapidFireQuotes() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentQuoteCount = this.recentQuotes.filter(q => q.timestamp > fiveMinutesAgo).length;

    if (recentQuoteCount > 20) {
      this.sendAlert(`Warning: ${recentQuoteCount} quotes generated in 5 minutes - possible automation or testing`);
    }
  }

  // Generate health status
  getHealthStatus() {
    const uptime = Date.now() - this.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);

    const errorRate = this.metrics.quotesGenerated > 0
      ? (this.metrics.errors / this.metrics.quotesGenerated) * 100
      : 0;

    const status = {
      status: errorRate < 1 ? 'HEALTHY' : errorRate < 5 ? 'WARNING' : 'CRITICAL',
      uptime: `${uptimeHours.toFixed(1)} hours`,
      metrics: this.metrics,
      errorRate: `${errorRate.toFixed(2)}%`,
      averageResponseTime: `${this.metrics.averageResponseTime.toFixed(0)}ms`
    };

    return status;
  }

  // Generate periodic reports
  generatePeriodicReport() {
    const health = this.getHealthStatus();
    const report = {
      timestamp: new Date().toISOString(),
      health: health,
      recentActivity: this.analyzeRecentActivity()
    };

    console.log('PERIODIC_REPORT:', JSON.stringify(report, null, 2));
    this.logToFile('periodic_reports.log', report);

    // Alert if error rate is high
    if (health.status === 'CRITICAL') {
      this.sendCriticalAlert(`System health is CRITICAL - Error rate: ${health.errorRate}`);
    }
  }

  // Analyze recent activity for trends
  analyzeRecentActivity() {
    if (this.recentQuotes.length === 0) {
      return { message: 'No recent activity' };
    }

    const totalAmount = this.recentQuotes.reduce((sum, q) => sum + q.amount, 0);
    const averageAmount = totalAmount / this.recentQuotes.length;
    const maxAmount = Math.max(...this.recentQuotes.map(q => q.amount));
    const minAmount = Math.min(...this.recentQuotes.map(q => q.amount));

    const systemTypes = {};
    this.recentQuotes.forEach(q => {
      systemTypes[q.systemType] = (systemTypes[q.systemType] || 0) + 1;
    });

    return {
      quoteCount: this.recentQuotes.length,
      averageAmount: Math.round(averageAmount),
      maxAmount: maxAmount,
      minAmount: minAmount,
      systemTypeDistribution: systemTypes,
      multiSitePercentage: Math.round(
        (this.recentQuotes.filter(q => q.isMultiSite).length / this.recentQuotes.length) * 100
      )
    };
  }

  // Log to file
  logToFile(filename, data) {
    const fs = require('fs');
    const path = require('path');
    const logDir = './audit';
    const logFile = path.join(logDir, filename);

    try {
      // Ensure directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logEntry = `${new Date().toISOString()}: ${JSON.stringify(data)}\n`;
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  // Send alerts (implement with your preferred system)
  sendAlert(message) {
    console.log('ALERT:', message);
    this.logToFile('alerts.log', { level: 'WARNING', message: message });
  }

  sendCriticalAlert(message) {
    console.error('CRITICAL_ALERT:', message);
    this.logToFile('alerts.log', { level: 'CRITICAL', message: message });

    // In production, integrate with:
    // - Slack webhooks
    // - Email notifications
    // - PagerDuty
    // - SMS alerts
  }

  // Production readiness check
  getProductionReadiness() {
    const health = this.getHealthStatus();
    const checks = {
      errorRate: {
        status: parseFloat(health.errorRate) < 1 ? 'PASS' : 'FAIL',
        value: health.errorRate,
        requirement: '<1%'
      },
      responseTime: {
        status: this.metrics.averageResponseTime < 3000 ? 'PASS' : 'FAIL',
        value: `${this.metrics.averageResponseTime.toFixed(0)}ms`,
        requirement: '<3000ms'
      },
      uptime: {
        status: health.status !== 'CRITICAL' ? 'PASS' : 'FAIL',
        value: health.status,
        requirement: 'Not CRITICAL'
      }
    };

    const allPassed = Object.values(checks).every(check => check.status === 'PASS');

    return {
      ready: allPassed,
      checks: checks,
      recommendation: allPassed
        ? 'System meets production readiness criteria'
        : 'System requires attention before production deployment'
    };
  }
}

// Singleton instance
let monitorInstance = null;

function getProductionMonitor() {
  if (!monitorInstance) {
    monitorInstance = new ProductionMonitor();
  }
  return monitorInstance;
}

module.exports = { ProductionMonitor, getProductionMonitor };