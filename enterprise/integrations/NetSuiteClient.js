/**
 * Enterprise NetSuite Integration Client
 * Handles all NetSuite API interactions with proper error handling and resilience
 */

const axios = require('axios');
const CircuitBreaker = require('opossum');

class NetSuiteClient {
  constructor(config, logger, cache) {
    this.config = config;
    this.logger = logger;
    this.cache = cache;
    this.baseURL = config.netsuiteUrl;
    this.tokenId = config.tokenId;
    this.tokenSecret = config.tokenSecret;
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.accountId = config.accountId;

    // Initialize circuit breaker for resilience
    this.circuitBreakerOptions = {
      timeout: 10000, // 10 seconds
      errorThresholdPercentage: 50,
      resetTimeout: 30000, // 30 seconds
      rollingCountTimeout: 60000, // 1 minute
      rollingCountBuckets: 10
    };

    this.priceBreaker = new CircuitBreaker(this._getPricing.bind(this), this.circuitBreakerOptions);
    this.inventoryBreaker = new CircuitBreaker(this._getInventoryLevels.bind(this), this.circuitBreakerOptions);
    this.skuBreaker = new CircuitBreaker(this._validateSkus.bind(this), this.circuitBreakerOptions);

    this.setupCircuitBreakerEvents();
  }

  setupCircuitBreakerEvents() {
    [this.priceBreaker, this.inventoryBreaker, this.skuBreaker].forEach(breaker => {
      breaker.on('open', () => {
        this.logger.error('NetSuite Circuit Breaker OPENED - Too many failures');
        // Alert operations team
        this.sendAlert('CIRCUIT_BREAKER_OPEN', 'NetSuite integration circuit breaker opened');
      });

      breaker.on('halfOpen', () => {
        this.logger.warn('NetSuite Circuit Breaker HALF-OPEN - Testing connectivity');
      });

      breaker.on('close', () => {
        this.logger.info('NetSuite Circuit Breaker CLOSED - Service recovered');
      });
    });
  }

  async getPricing(skus, options = {}) {
    const cacheKey = `pricing:${skus.sort().join(',')}`;

    try {
      // Check cache first (prices cached for 5 minutes)
      if (!options.bypassCache) {
        const cachedPricing = await this.cache.get(cacheKey);
        if (cachedPricing) {
          this.logger.debug(`Retrieved pricing from cache for ${skus.length} SKUs`);
          return cachedPricing;
        }
      }

      // Use circuit breaker for resilience
      const pricing = await this.priceBreaker.fire(skus);

      // Cache the results
      await this.cache.set(cacheKey, pricing, 300); // 5 minutes

      this.logger.info(`Retrieved pricing from NetSuite for ${skus.length} SKUs`);
      return pricing;

    } catch (error) {
      this.logger.error('Failed to get pricing from NetSuite', {
        error: error.message,
        skus: skus,
        stack: error.stack
      });

      // Fallback to last known good pricing if available
      const fallbackPricing = await this.cache.get(`${cacheKey}:fallback`);
      if (fallbackPricing) {
        this.logger.warn('Using fallback pricing due to NetSuite failure');
        return fallbackPricing;
      }

      throw new NetSuiteError(`Unable to retrieve pricing: ${error.message}`, 'PRICING_FAILURE', skus);
    }
  }

  async _getPricing(skus) {
    const batchSize = 50; // NetSuite API limit
    const allPricing = {};

    // Process SKUs in batches
    for (let i = 0; i < skus.length; i += batchSize) {
      const batch = skus.slice(i, i + batchSize);
      const batchPricing = await this.fetchPricingBatch(batch);
      Object.assign(allPricing, batchPricing);
    }

    // Store as fallback for future failures
    await this.cache.set(`pricing:${skus.sort().join(',')}:fallback`, allPricing, 86400); // 24 hours

    return allPricing;
  }

  async fetchPricingBatch(skus) {
    const query = {
      type: 'item',
      filters: [
        ['itemid', 'anyof', skus],
        'AND',
        ['isinactive', 'is', 'F']
      ],
      columns: [
        'itemid',
        'displayname',
        'baseprice',
        'cost',
        'lastmodified',
        'inventorylocation'
      ]
    };

    try {
      const response = await this.makeNetSuiteRequest('search', {
        searchType: query.type,
        filters: query.filters,
        columns: query.columns
      });

      const pricing = {};

      response.data.list.forEach(item => {
        pricing[item.values.itemid] = {
          sku: item.values.itemid,
          name: item.values.displayname,
          price: parseFloat(item.values.baseprice || 0),
          cost: parseFloat(item.values.cost || 0),
          lastUpdated: new Date(item.values.lastmodified).getTime(),
          location: item.values.inventorylocation
        };
      });

      return pricing;

    } catch (error) {
      throw new Error(`NetSuite pricing batch request failed: ${error.message}`);
    }
  }

  async getInventoryLevels(skus) {
    try {
      const inventory = await this.inventoryBreaker.fire(skus);
      return inventory;
    } catch (error) {
      this.logger.error('Failed to get inventory from NetSuite', {
        error: error.message,
        skus: skus
      });
      throw new NetSuiteError(`Unable to retrieve inventory: ${error.message}`, 'INVENTORY_FAILURE', skus);
    }
  }

  async _getInventoryLevels(skus) {
    const query = {
      type: 'inventoryitem',
      filters: [
        ['itemid', 'anyof', skus],
        'AND',
        ['isinactive', 'is', 'F']
      ],
      columns: [
        'itemid',
        'quantityavailable',
        'quantityonhand',
        'quantitycommitted',
        'reorderpoint',
        'preferredlocation'
      ]
    };

    const response = await this.makeNetSuiteRequest('search', {
      searchType: query.type,
      filters: query.filters,
      columns: query.columns
    });

    const inventory = {};

    response.data.list.forEach(item => {
      inventory[item.values.itemid] = {
        sku: item.values.itemid,
        available: parseInt(item.values.quantityavailable || 0),
        onHand: parseInt(item.values.quantityonhand || 0),
        committed: parseInt(item.values.quantitycommitted || 0),
        reorderPoint: parseInt(item.values.reorderpoint || 0),
        location: item.values.preferredlocation
      };
    });

    return inventory;
  }

  async validateSkus(skus) {
    try {
      const validSkus = await this.skuBreaker.fire(skus);
      return validSkus;
    } catch (error) {
      this.logger.error('Failed to validate SKUs in NetSuite', {
        error: error.message,
        skus: skus
      });
      throw new NetSuiteError(`Unable to validate SKUs: ${error.message}`, 'SKU_VALIDATION_FAILURE', skus);
    }
  }

  async _validateSkus(skus) {
    const query = {
      type: 'item',
      filters: [
        ['itemid', 'anyof', skus],
        'AND',
        ['isinactive', 'is', 'F']
      ],
      columns: ['itemid']
    };

    const response = await this.makeNetSuiteRequest('search', {
      searchType: query.type,
      filters: query.filters,
      columns: query.columns
    });

    return response.data.list.map(item => item.values.itemid);
  }

  async createQuote(quoteData) {
    try {
      this.logger.info('Creating quote in NetSuite', {
        quoteNumber: quoteData.quoteNumber,
        customerName: quoteData.customerName,
        totalAmount: quoteData.totalAmount
      });

      const netsuiteQuote = this.transformQuoteForNetSuite(quoteData);

      const response = await this.makeNetSuiteRequest('record', {
        type: 'estimate',
        method: 'POST',
        data: netsuiteQuote
      });

      this.logger.info('Quote created successfully in NetSuite', {
        quoteNumber: quoteData.quoteNumber,
        netsuiteId: response.data.id
      });

      return {
        success: true,
        netsuiteId: response.data.id,
        quoteNumber: response.data.tranid
      };

    } catch (error) {
      this.logger.error('Failed to create quote in NetSuite', {
        error: error.message,
        quoteNumber: quoteData.quoteNumber,
        stack: error.stack
      });

      throw new NetSuiteError(`Quote creation failed: ${error.message}`, 'QUOTE_CREATION_FAILURE', quoteData);
    }
  }

  transformQuoteForNetSuite(quoteData) {
    return {
      entity: { id: quoteData.customerId },
      trandate: new Date().toISOString().split('T')[0],
      memo: `AI Generated Quote - ${quoteData.systemType}`,
      item: quoteData.lineItems.map(item => ({
        item: { id: item.netsuiteItemId },
        quantity: item.quantity,
        rate: item.unitPrice,
        description: item.description
      })),
      customform: { id: this.config.quoteFormId },
      // Custom fields for tracking
      custbody_ai_quote_id: quoteData.id,
      custbody_system_type: quoteData.systemType,
      custbody_user_count: quoteData.userCount,
      custbody_site_count: quoteData.siteCount || 1
    };
  }

  async makeNetSuiteRequest(endpoint, data, retries = 3) {
    const headers = this.generateOAuthHeaders(endpoint, data);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios({
          method: 'POST',
          url: `${this.baseURL}/rest/${endpoint}`,
          headers: headers,
          data: data,
          timeout: 10000
        });

        return response;

      } catch (error) {
        const isLastAttempt = attempt === retries;

        if (error.response?.status === 429) {
          // Rate limiting - wait and retry
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(`NetSuite rate limit hit, waiting ${waitTime}ms before retry ${attempt}`);
          await this.sleep(waitTime);
          continue;
        }

        if (error.response?.status >= 500 && !isLastAttempt) {
          // Server error - retry
          this.logger.warn(`NetSuite server error, retrying attempt ${attempt + 1}`);
          await this.sleep(1000 * attempt);
          continue;
        }

        if (isLastAttempt) {
          throw new Error(`NetSuite request failed after ${retries} attempts: ${error.message}`);
        }
      }
    }
  }

  generateOAuthHeaders(endpoint, data) {
    // OAuth 1.0 signature generation for NetSuite
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Math.random().toString(36).substring(7);

    // This is a simplified version - use a proper OAuth library in production
    return {
      'Authorization': `OAuth realm="${this.accountId}",oauth_consumer_key="${this.consumerKey}",oauth_token="${this.tokenId}",oauth_signature_method="HMAC-SHA256",oauth_timestamp="${timestamp}",oauth_nonce="${nonce}",oauth_version="1.0",oauth_signature="..."`,
      'Content-Type': 'application/json'
    };
  }

  async sendAlert(type, message, data = {}) {
    // Integration with alerting system (PagerDuty, Slack, etc.)
    this.logger.error(`ALERT: ${type}`, { message, data });

    // In production, implement actual alerting:
    // - PagerDuty for critical issues
    // - Slack for warnings
    // - Email for business stakeholders
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class NetSuiteError extends Error {
  constructor(message, type, context) {
    super(message);
    this.name = 'NetSuiteError';
    this.type = type;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

module.exports = { NetSuiteClient, NetSuiteError };