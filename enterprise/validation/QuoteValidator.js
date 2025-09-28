/**
 * Enterprise Quote Validation System
 * Prevents costly quoting errors through comprehensive validation
 */

class QuoteValidator {
  constructor(netsuiteClient, auditLogger) {
    this.netsuite = netsuiteClient;
    this.auditLogger = auditLogger;
    this.validationRules = new Map();
    this.setupValidationRules();
  }

  setupValidationRules() {
    // Business rule: Maximum users per quote
    this.validationRules.set('maxUsers', {
      validate: (quote) => quote.userCount <= 10000,
      error: 'Quote exceeds maximum user limit of 10,000',
      severity: 'CRITICAL'
    });

    // Business rule: Minimum margin requirements
    this.validationRules.set('minimumMargin', {
      validate: (quote) => {
        const margin = (quote.totalAmount - quote.costBasis) / quote.totalAmount;
        return margin >= 0.25; // 25% minimum margin
      },
      error: 'Quote margin below minimum 25% threshold',
      severity: 'HIGH'
    });

    // Business rule: Price reasonableness check
    this.validationRules.set('priceReasonableness', {
      validate: (quote) => {
        const pricePerUser = quote.totalAmount / quote.userCount;
        return pricePerUser >= 300 && pricePerUser <= 5000;
      },
      error: 'Price per user outside reasonable range ($300-$5000)',
      severity: 'HIGH'
    });

    // Technical validation: NetSuite SKU verification
    this.validationRules.set('skuVerification', {
      validate: async (quote) => {
        return await this.validateAllSkusInNetSuite(quote.lineItems);
      },
      error: 'One or more SKUs not found in NetSuite',
      severity: 'CRITICAL'
    });
  }

  async validateQuote(quote, options = {}) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      auditId: this.generateAuditId()
    };

    try {
      // Log validation attempt
      await this.auditLogger.log({
        action: 'QUOTE_VALIDATION_START',
        quoteId: quote.id,
        auditId: validationResults.auditId,
        userCount: quote.userCount,
        totalAmount: quote.totalAmount,
        timestamp: new Date().toISOString()
      });

      // Run all validation rules
      for (const [ruleName, rule] of this.validationRules) {
        try {
          const isValid = await rule.validate(quote);

          if (!isValid) {
            const error = {
              rule: ruleName,
              message: rule.error,
              severity: rule.severity,
              timestamp: new Date().toISOString()
            };

            if (rule.severity === 'CRITICAL') {
              validationResults.errors.push(error);
              validationResults.isValid = false;
            } else {
              validationResults.warnings.push(error);
            }
          }
        } catch (validationError) {
          // Validation rule itself failed
          validationResults.errors.push({
            rule: ruleName,
            message: `Validation rule failed: ${validationError.message}`,
            severity: 'CRITICAL',
            timestamp: new Date().toISOString()
          });
          validationResults.isValid = false;
        }
      }

      // Additional business logic validations
      await this.validateSystemArchitecture(quote, validationResults);
      await this.validatePricingAccuracy(quote, validationResults);
      await this.validateInventoryAvailability(quote, validationResults);

      // Log validation completion
      await this.auditLogger.log({
        action: 'QUOTE_VALIDATION_COMPLETE',
        quoteId: quote.id,
        auditId: validationResults.auditId,
        isValid: validationResults.isValid,
        errorCount: validationResults.errors.length,
        warningCount: validationResults.warnings.length,
        timestamp: new Date().toISOString()
      });

      return validationResults;

    } catch (error) {
      // Critical validation system failure
      await this.auditLogger.log({
        action: 'QUOTE_VALIDATION_SYSTEM_ERROR',
        quoteId: quote.id,
        auditId: validationResults.auditId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      throw new ValidationSystemError(`Quote validation system failure: ${error.message}`);
    }
  }

  async validateSystemArchitecture(quote, validationResults) {
    // Validate that system architecture matches user count and requirements
    const { systemType, userCount, siteCount, isMultiSite } = quote;

    if (isMultiSite && siteCount > 1) {
      // Multi-site deployments must use advanced systems
      const validMultiSiteSystems = ['IP Site Connect', 'Linked Capacity Plus', 'Capacity Max'];

      if (!validMultiSiteSystems.includes(systemType)) {
        validationResults.errors.push({
          rule: 'systemArchitecture',
          message: `Multi-site deployment with ${siteCount} sites requires advanced system (IP Site Connect, Linked Capacity Plus, or Capacity Max), not ${systemType}`,
          severity: 'CRITICAL',
          businessImpact: 'CUSTOMER_CANNOT_ACHIEVE_REQUIREMENTS'
        });
        validationResults.isValid = false;
      }

      // Validate system capacity
      if (systemType === 'IP Site Connect' && userCount > 250) {
        validationResults.errors.push({
          rule: 'systemCapacity',
          message: `IP Site Connect supports max 250 users, quote has ${userCount} users`,
          severity: 'CRITICAL',
          recommendation: 'Use Linked Capacity Plus for 251-1500 users'
        });
        validationResults.isValid = false;
      }

      if (systemType === 'Linked Capacity Plus' && userCount > 1500) {
        validationResults.errors.push({
          rule: 'systemCapacity',
          message: `Linked Capacity Plus supports max 1500 users, quote has ${userCount} users`,
          severity: 'CRITICAL',
          recommendation: 'Use Capacity Max for >1500 users'
        });
        validationResults.isValid = false;
      }
    }
  }

  async validatePricingAccuracy(quote, validationResults) {
    try {
      // Verify prices against NetSuite in real-time
      const netSuitePrices = await this.netsuite.getPricing(quote.lineItems.map(item => item.sku));

      for (const lineItem of quote.lineItems) {
        const netSuitePrice = netSuitePrices[lineItem.sku];

        if (!netSuitePrice) {
          validationResults.errors.push({
            rule: 'pricingAccuracy',
            message: `SKU ${lineItem.sku} not found in NetSuite pricing`,
            severity: 'CRITICAL',
            sku: lineItem.sku
          });
          validationResults.isValid = false;
          continue;
        }

        // Allow for small pricing discrepancies (1%) due to timing
        const priceDifference = Math.abs(lineItem.unitPrice - netSuitePrice.price);
        const percentageDifference = priceDifference / netSuitePrice.price;

        if (percentageDifference > 0.01) { // 1% tolerance
          validationResults.errors.push({
            rule: 'pricingAccuracy',
            message: `Price mismatch for SKU ${lineItem.sku}: Quote=$${lineItem.unitPrice}, NetSuite=$${netSuitePrice.price}`,
            severity: 'CRITICAL',
            quotedPrice: lineItem.unitPrice,
            actualPrice: netSuitePrice.price,
            difference: priceDifference
          });
          validationResults.isValid = false;
        }

        // Check for recent price changes
        if (netSuitePrice.lastUpdated > Date.now() - (24 * 60 * 60 * 1000)) { // Last 24 hours
          validationResults.warnings.push({
            rule: 'recentPriceChange',
            message: `SKU ${lineItem.sku} price updated in last 24 hours`,
            severity: 'MEDIUM',
            sku: lineItem.sku,
            priceChangeDate: netSuitePrice.lastUpdated
          });
        }
      }
    } catch (error) {
      validationResults.errors.push({
        rule: 'pricingAccuracy',
        message: `Unable to verify pricing against NetSuite: ${error.message}`,
        severity: 'CRITICAL'
      });
      validationResults.isValid = false;
    }
  }

  async validateInventoryAvailability(quote, validationResults) {
    try {
      const inventoryLevels = await this.netsuite.getInventoryLevels(quote.lineItems.map(item => item.sku));

      for (const lineItem of quote.lineItems) {
        const inventory = inventoryLevels[lineItem.sku];

        if (!inventory) {
          validationResults.warnings.push({
            rule: 'inventoryAvailability',
            message: `Unable to verify inventory for SKU ${lineItem.sku}`,
            severity: 'MEDIUM',
            sku: lineItem.sku
          });
          continue;
        }

        if (inventory.available < lineItem.quantity) {
          if (inventory.available === 0) {
            validationResults.errors.push({
              rule: 'inventoryAvailability',
              message: `SKU ${lineItem.sku} is out of stock (requested: ${lineItem.quantity})`,
              severity: 'HIGH',
              sku: lineItem.sku,
              requested: lineItem.quantity,
              available: inventory.available
            });
          } else {
            validationResults.warnings.push({
              rule: 'inventoryAvailability',
              message: `Insufficient inventory for SKU ${lineItem.sku} (requested: ${lineItem.quantity}, available: ${inventory.available})`,
              severity: 'HIGH',
              sku: lineItem.sku,
              requested: lineItem.quantity,
              available: inventory.available,
              expectedDate: inventory.nextDeliveryDate
            });
          }
        }
      }
    } catch (error) {
      validationResults.warnings.push({
        rule: 'inventoryAvailability',
        message: `Unable to verify inventory levels: ${error.message}`,
        severity: 'MEDIUM'
      });
    }
  }

  async validateAllSkusInNetSuite(lineItems) {
    try {
      const skus = lineItems.map(item => item.sku);
      const netSuiteSkus = await this.netsuite.validateSkus(skus);
      return skus.every(sku => netSuiteSkus.includes(sku));
    } catch (error) {
      throw new Error(`NetSuite SKU validation failed: ${error.message}`);
    }
  }

  generateAuditId() {
    return `VAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

class ValidationSystemError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationSystemError';
  }
}

module.exports = { QuoteValidator, ValidationSystemError };