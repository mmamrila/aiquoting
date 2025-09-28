const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const productCompatibility = require('../utils/productCompatibility');

/**
 * Quote Builder Service
 * Creates formal quotes with specific parts, quantities, and pricing
 */
class QuoteBuilder {
  constructor() {
    this.taxRate = 0.08; // 8% tax rate (configurable)
    this.laborRate = 85; // $85/hour labor rate
  }

  /**
   * Create a complete quote from AI recommendations
   */
  async createQuoteFromRecommendation(recommendation, clientInfo, sessionId) {
    try {
      console.log('🏗️ Building formal quote from AI recommendation...');

      // Step 1: Create or find client
      const client = await this.createOrFindClient(clientInfo);

      // Step 2: Create quote record
      const quote = await this.createQuoteRecord(client.id, recommendation, sessionId);

      // Step 3: Add parts to quote
      await this.addPartsToQuote(quote.id, recommendation);

      // Step 4: Calculate totals
      await this.calculateQuoteTotals(quote.id);

      // Step 5: Get complete quote with line items
      const completeQuote = await this.getCompleteQuote(quote.id);

      console.log(`✅ Quote #${quote.quote_number} created successfully`);
      return completeQuote;

    } catch (error) {
      console.error('❌ Error creating quote:', error.message);
      throw error;
    }
  }

  /**
   * Create a multi-site quote with proper inter-site communication
   */
  async createMultiSiteQuote(requirements) {
    const {
      systemType,
      userCount,
      industry,
      sessionId,
      siteCount,
      usersPerSite,
      requiresInterSite,
      isMultiSite
    } = requirements;

    try {
      console.log(`🏗️ Building ${systemType} quote for ${siteCount} sites with ${usersPerSite} users each (${userCount} total)...`);

      // Create client info from requirements
      const clientInfo = {
        name: isMultiSite ?
          `${industry} - ${siteCount} Locations (${userCount} Users)` :
          `${industry} - ${userCount} Users`,
        industry: industry,
        user_count: userCount,
        contact_person: 'Prospect',
        email: 'prospect@example.com',
        special_requirements: isMultiSite ?
          `Multi-site system with ${siteCount} locations requiring ${requiresInterSite ? 'inter-site communication' : 'independent operation'}` :
          null
      };

      // Create or find client
      const client = await this.createOrFindClient(clientInfo);

      // Create quote record
      const quote = await this.createQuoteRecord(client.id, {
        systemType,
        userCount,
        siteCount,
        usersPerSite,
        requiresInterSite,
        isMultiSite
      }, sessionId);

      // Add parts for multi-site system
      await this.addMultiSiteParts(quote.id, requirements);

      // Calculate totals
      await this.calculateQuoteTotals(quote.id);

      // Get complete quote with line items
      const completeQuote = await this.getCompleteQuote(quote.id);

      console.log(`✅ Multi-site quote #${quote.quote_number} created successfully`);
      return completeQuote;

    } catch (error) {
      console.error('❌ Error creating multi-site quote:', error.message);
      throw error;
    }
  }

  /**
   * Create a quote from a specific system recommendation
   */
  async createSystemQuote(systemType, userCount, industry, sessionId = null) {
    try {
      console.log(`🏗️ Building ${systemType} quote for ${userCount} users in ${industry}...`);

      // Get system recommendation
      const requirements = {
        industry: industry,
        userCount: userCount,
        frequencyBand: 'UHF',
        systemType: systemType
      };

      const systemRecommendation = await productCompatibility.recommendSystem(requirements);

      // Add userCount to recommendation if missing
      systemRecommendation.userCount = userCount;

      // Create client info from requirements
      const clientInfo = {
        name: `${industry} - ${userCount} Users`,
        industry: industry,
        user_count: userCount,
        contact_person: 'Prospect',
        email: 'prospect@example.com'
      };

      // Build formal quote
      return await this.createQuoteFromRecommendation(systemRecommendation, clientInfo, sessionId);

    } catch (error) {
      console.error('❌ Error creating system quote:', error.message);
      throw error;
    }
  }

  /**
   * Create or find existing client
   */
  async createOrFindClient(clientInfo) {
    return new Promise((resolve, reject) => {
      // Try to find existing client by name AND industry (not just email since prospects use same email)
      db.get(`
        SELECT * FROM clients
        WHERE name = ? AND industry = ?
        LIMIT 1
      `, [clientInfo.name, clientInfo.industry], (err, existingClient) => {
        if (err) return reject(err);

        if (existingClient) {
          console.log(`📋 Using existing client: ${existingClient.name}`);
          return resolve(existingClient);
        }

        // Create new client
        const sql = `
          INSERT INTO clients (
            name, industry, contact_person, email, phone, address,
            current_system, coverage_area, user_count, special_requirements
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          clientInfo.name,
          clientInfo.industry || 'General',
          clientInfo.contact_person || 'Prospect',
          clientInfo.email || 'prospect@example.com',
          clientInfo.phone || '',
          clientInfo.address || '',
          clientInfo.current_system || '',
          clientInfo.coverage_area || '',
          clientInfo.user_count || 0,
          clientInfo.special_requirements || ''
        ];

        db.run(sql, values, function(err) {
          if (err) return reject(err);

          db.get('SELECT * FROM clients WHERE id = ?', [this.lastID], (err, newClient) => {
            if (err) return reject(err);
            console.log(`👤 Created new client: ${newClient.name}`);
            resolve(newClient);
          });
        });
      });
    });
  }

  /**
   * Create quote record
   */
  async createQuoteRecord(clientId, recommendation, sessionId) {
    return new Promise((resolve, reject) => {
      const quoteNumber = this.generateQuoteNumber();
      const systemType = recommendation.systemType || 'Conventional';

      const sql = `
        INSERT INTO quotes (
          quote_number, client_id, status, system_type, notes
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const notes = sessionId ? `Generated from AI session: ${sessionId}` : 'AI Generated Quote';

      db.run(sql, [quoteNumber, clientId, 'draft', systemType, notes], function(err) {
        if (err) return reject(err);

        const quote = {
          id: this.lastID,
          quote_number: quoteNumber,
          client_id: clientId,
          system_type: systemType
        };

        console.log(`📄 Created quote record: ${quoteNumber}`);
        resolve(quote);
      });
    });
  }

  /**
   * Add parts for multi-site system
   */
  async addMultiSiteParts(quoteId, requirements) {
    const {
      siteCount,
      usersPerSite,
      userCount,
      requiresInterSite,
      systemType
    } = requirements;

    console.log('📦 Adding multi-site parts to quote...');

    try {
      // Add repeaters (one per site)
      await this.addPartToQuote(
        quoteId,
        'XPR3300e-UHF-4W', // Fallback radio SKU as repeater placeholder
        siteCount,
        `Repeater systems - 1 per location (${siteCount} total)`
      );

      // Add radios for all sites
      await this.addPartToQuote(
        quoteId,
        'XPR3300e-UHF-4W',
        userCount,
        `Portable radios - ${usersPerSite} per location × ${siteCount} locations`
      );

      // Add inter-site communication equipment if required
      if (requiresInterSite) {
        await this.addInterSiteCommunication(quoteId, siteCount, systemType);
      }

      // Add accessories per radio (batteries, chargers, clips)
      await this.addStandardAccessoryFallback(quoteId, userCount);

      // Add multi-site installation labor
      await this.addMultiSiteInstallationLabor(quoteId, requirements);

      // Add licensing (more complex for multi-site)
      await this.addMultiSiteLicensing(quoteId, siteCount, requiresInterSite);

    } catch (error) {
      console.error('❌ Error adding multi-site parts:', error.message);
      throw error;
    }
  }

  /**
   * Add parts to quote based on recommendation
   */
  async addPartsToQuote(quoteId, recommendation) {
    console.log('📦 Adding parts to quote...');

    try {
      // Add repeater if recommended
      if (recommendation.repeaters && recommendation.repeaters.recommended) {
        await this.addPartToQuote(
          quoteId,
          recommendation.repeaters.recommended.sku,
          recommendation.repeaters.quantity || 1,
          'Repeater System - Provides wide area coverage'
        );
      }

      // Add radios if recommended
      if (recommendation.radios && recommendation.radios.recommended) {
        const radioQuantity = recommendation.userCount || 25;
        await this.addPartToQuote(
          quoteId,
          recommendation.radios.recommended.sku,
          radioQuantity,
          `Portable radios for ${radioQuantity} users`
        );

        // Add standard accessories for each radio
        await this.addStandardAccessories(quoteId, recommendation.radios.recommended.sku, radioQuantity);
      } else {
        // Fallback: Add radios from enhanced table if recommendation system failed
        await this.addFallbackRadios(quoteId, recommendation);
      }

      // Add installation labor
      await this.addInstallationLabor(quoteId, recommendation);

      // Add licensing if required
      await this.addLicensing(quoteId, recommendation);

    } catch (error) {
      console.error('❌ Error adding parts to quote:', error.message);
      throw error;
    }
  }

  /**
   * Add a specific part to quote
   */
  async addPartToQuote(quoteId, sku, quantity, notes = '') {
    return new Promise((resolve, reject) => {
      // Get part details (try enhanced table first, then regular table)
      db.get('SELECT * FROM parts_enhanced WHERE sku = ?', [sku], (err, part) => {
        if (err) return reject(err);
        if (part) {
          return this.insertQuoteItem(quoteId, part, quantity, notes, resolve, reject);
        }

        // Fallback to regular parts table
        db.get('SELECT * FROM parts WHERE sku = ?', [sku], (err, part) => {
          if (err) return reject(err);
          if (!part) {
            console.warn(`⚠️ Part not found: ${sku}`);
            return resolve();
          }

          this.insertQuoteItem(quoteId, part, quantity, notes, resolve, reject);
        });
      });
    });
  }

  /**
   * Helper method to insert quote item
   */
  insertQuoteItem(quoteId, part, quantity, notes, resolve, reject) {
    const unitPrice = part.price;
    const totalPrice = unitPrice * quantity;
    const laborHours = (part.labor_hours || 0) * quantity;

    const sql = `
      INSERT INTO quote_items (
        quote_id, part_id, quantity, unit_price, total_price, labor_hours, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [quoteId, part.id, quantity, unitPrice, totalPrice, laborHours, notes], (err) => {
      if (err) return reject(err);
      console.log(`   ✅ Added: ${quantity}x ${part.name} - $${totalPrice.toFixed(2)}`);
      resolve();
    });
  }

  /**
   * Add fallback radios when recommendation system fails
   */
  async addFallbackRadios(quoteId, recommendation) {
    return new Promise((resolve, reject) => {
      const userCount = recommendation.userCount || 25;
      const frequencyBand = 'UHF'; // Default to UHF

      // Get available radios from enhanced table
      db.all(`
        SELECT * FROM parts_enhanced
        WHERE category = 'Portable Radios'
        AND frequency_band = ?
        ORDER BY price ASC
      `, [frequencyBand], async (err, radios) => {
        if (err) return reject(err);

        if (radios.length === 0) {
          console.warn('⚠️ No UHF radios found, trying any frequency');
          // Try any frequency band
          db.all(`
            SELECT * FROM parts_enhanced
            WHERE category = 'Portable Radios'
            ORDER BY price ASC
          `, [], async (err, allRadios) => {
            if (err) return reject(err);

            if (allRadios.length > 0) {
              await this.addPartToQuote(quoteId, allRadios[0].sku, userCount, `${userCount}x ${allRadios[0].name}`);
              await this.addStandardAccessoryFallback(quoteId, userCount);
            }
            resolve();
          });
        } else {
          // Use the most affordable UHF radio
          await this.addPartToQuote(quoteId, radios[0].sku, userCount, `${userCount}x ${radios[0].name}`);
          await this.addStandardAccessoryFallback(quoteId, userCount);
          resolve();
        }
      });
    });
  }

  /**
   * Add standard accessories for radios
   */
  async addStandardAccessories(quoteId, radioSku, radioQuantity) {
    try {
      // Get compatible accessories
      const compatibility = await productCompatibility.getCompatibleAccessories(radioSku);

      if (!compatibility.accessories || compatibility.accessories.length === 0) {
        console.log('⚠️ No compatible accessories found, adding standard items');
        await this.addStandardAccessoryFallback(quoteId, radioQuantity);
        return;
      }

      // Add battery for each radio
      const batteries = compatibility.accessories.filter(acc =>
        acc.subcategory === 'Batteries' && acc.inventory_qty > 0
      );
      if (batteries.length > 0) {
        await this.addPartToQuote(quoteId, batteries[0].sku, radioQuantity, 'Replacement battery for each radio');
      }

      // Add charger for every 5 radios (minimum 1)
      const chargers = compatibility.accessories.filter(acc =>
        acc.subcategory === 'Chargers' && acc.inventory_qty > 0
      );
      if (chargers.length > 0) {
        const chargerQuantity = Math.max(1, Math.ceil(radioQuantity / 5));
        await this.addPartToQuote(quoteId, chargers[0].sku, chargerQuantity, 'Desktop chargers');
      }

      // Add belt clips for each radio
      const clips = compatibility.accessories.filter(acc =>
        acc.name.toLowerCase().includes('belt') || acc.name.toLowerCase().includes('clip')
      );
      if (clips.length > 0) {
        await this.addPartToQuote(quoteId, clips[0].sku, radioQuantity, 'Belt clip for each radio');
      }

    } catch (error) {
      console.warn('⚠️ Error adding compatible accessories, using fallback');
      await this.addStandardAccessoryFallback(quoteId, radioQuantity);
    }
  }

  /**
   * Add standard accessories when compatibility lookup fails
   */
  async addStandardAccessoryFallback(quoteId, radioQuantity) {
    // Add generic battery
    await this.addPartToQuote(quoteId, 'PMNN4434', radioQuantity, 'Li-ion battery for each radio');

    // Add charger
    const chargerQuantity = Math.max(1, Math.ceil(radioQuantity / 5));
    await this.addPartToQuote(quoteId, 'PMLN5188', chargerQuantity, 'Desktop chargers');

    // Add belt clip
    await this.addPartToQuote(quoteId, 'PMLN4651', radioQuantity, 'Belt clip for each radio');
  }

  /**
   * Add installation labor to quote
   */
  async addInstallationLabor(quoteId, recommendation) {
    const laborHours = this.calculateInstallationHours(recommendation);
    const laborCost = laborHours * this.laborRate;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO quote_items (
          quote_id, part_id, quantity, unit_price, total_price, labor_hours, notes
        ) VALUES (?, NULL, 1, ?, ?, ?, ?)
      `;

      const notes = `Installation and programming (${laborHours} hours @ $${this.laborRate}/hour)`;

      db.run(sql, [quoteId, laborCost, laborCost, laborHours, notes], (err) => {
        if (err) return reject(err);
        console.log(`   ✅ Added installation labor: ${laborHours}h - $${laborCost.toFixed(2)}`);
        resolve();
      });
    });
  }

  /**
   * Add FCC licensing costs
   */
  async addLicensing(quoteId, recommendation) {
    const licensingCost = 800; // Standard FCC licensing cost

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO quote_items (
          quote_id, part_id, quantity, unit_price, total_price, labor_hours, notes
        ) VALUES (?, NULL, 1, ?, ?, 0, ?)
      `;

      const notes = 'FCC licensing and frequency coordination';

      db.run(sql, [quoteId, licensingCost, licensingCost, notes], (err) => {
        if (err) return reject(err);
        console.log(`   ✅ Added licensing: $${licensingCost.toFixed(2)}`);
        resolve();
      });
    });
  }

  /**
   * Calculate installation hours based on system complexity
   */
  calculateInstallationHours(recommendation) {
    let hours = 0;

    // Base hours for programming
    hours += 2;

    // Repeater installation
    if (recommendation.repeaters && recommendation.repeaters.quantity > 0) {
      hours += recommendation.repeaters.quantity * 8; // 8 hours per repeater
    }

    // Radio programming (15 minutes per radio)
    if (recommendation.userCount) {
      hours += Math.ceil(recommendation.userCount * 0.25);
    }

    // Minimum 4 hours for any installation
    return Math.max(4, hours);
  }

  /**
   * Calculate quote totals
   */
  async calculateQuoteTotals(quoteId) {
    return new Promise((resolve, reject) => {
      // Get all quote items
      db.all(`
        SELECT
          SUM(total_price) as total_parts,
          SUM(labor_hours) as total_labor_hours
        FROM quote_items
        WHERE quote_id = ?
      `, [quoteId], (err, result) => {
        if (err) return reject(err);

        const totalParts = result[0].total_parts || 0;
        const totalLaborHours = result[0].total_labor_hours || 0;
        const totalLabor = totalLaborHours * this.laborRate;
        const subtotal = totalParts + totalLabor;
        const totalTax = subtotal * this.taxRate;
        const totalAmount = subtotal + totalTax;

        // Update quote with totals
        const sql = `
          UPDATE quotes SET
            total_parts = ?,
            total_labor = ?,
            total_tax = ?,
            total_amount = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        db.run(sql, [totalParts, totalLabor, totalTax, totalAmount, quoteId], (err) => {
          if (err) return reject(err);

          console.log(`💰 Quote totals calculated: $${totalAmount.toFixed(2)}`);
          resolve({
            total_parts: totalParts,
            total_labor: totalLabor,
            total_tax: totalTax,
            total_amount: totalAmount
          });
        });
      });
    });
  }

  /**
   * Get complete quote with all line items
   */
  async getCompleteQuote(quoteId) {
    return new Promise((resolve, reject) => {
      // Get quote header
      db.get(`
        SELECT q.*, c.name as client_name, c.industry, c.contact_person, c.email
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.id = ?
      `, [quoteId], (err, quote) => {
        if (err) return reject(err);
        if (!quote) return reject(new Error('Quote not found'));

        // Get quote items
        db.all(`
          SELECT
            qi.*,
            p.name as part_name,
            p.sku,
            p.category,
            p.subcategory,
            p.description
          FROM quote_items qi
          LEFT JOIN parts p ON qi.part_id = p.id
          WHERE qi.quote_id = ?
          ORDER BY qi.id
        `, [quoteId], (err, items) => {
          if (err) return reject(err);

          quote.line_items = items;
          resolve(quote);
        });
      });
    });
  }

  /**
   * Add inter-site communication equipment
   */
  async addInterSiteCommunication(quoteId, siteCount, systemType) {
    // Different costs for different system types
    let linkingCost = 2500; // Default for IP Site Connect
    if (systemType === 'Linked Capacity Plus') {
      linkingCost = 3500; // Higher cost for Linked Capacity Plus
    } else if (systemType === 'Capacity Max') {
      linkingCost = 5000; // Highest cost for Capacity Max
    }

    const networkingCost = 1200; // Network equipment cost

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO quote_items (
          quote_id, part_id, quantity, unit_price, total_price, labor_hours, notes
        ) VALUES (?, NULL, 1, ?, ?, 0, ?)
      `;

      const totalCost = (linkingCost * siteCount) + networkingCost;
      const notes = `${systemType} inter-site communication - Linking ${siteCount} locations`;

      db.run(sql, [quoteId, totalCost, totalCost, notes], (err) => {
        if (err) return reject(err);
        console.log(`   ✅ Added inter-site communication: $${totalCost.toFixed(2)}`);
        resolve();
      });
    });
  }

  /**
   * Add multi-site installation labor
   */
  async addMultiSiteInstallationLabor(quoteId, requirements) {
    const { siteCount, userCount, requiresInterSite } = requirements;

    // Calculate hours: base hours per site + travel time + coordination
    const hoursPerSite = 12; // Base installation per site
    const travelHours = siteCount * 2; // Travel between sites
    const coordinationHours = requiresInterSite ? 8 : 4; // System coordination
    const totalHours = (hoursPerSite * siteCount) + travelHours + coordinationHours;

    const laborCost = totalHours * this.laborRate;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO quote_items (
          quote_id, part_id, quantity, unit_price, total_price, labor_hours, notes
        ) VALUES (?, NULL, 1, ?, ?, ?, ?)
      `;

      const notes = `Multi-site installation: ${siteCount} locations, ${totalHours} hours total`;

      db.run(sql, [quoteId, laborCost, laborCost, totalHours, notes], (err) => {
        if (err) return reject(err);
        console.log(`   ✅ Added multi-site installation: ${totalHours}h - $${laborCost.toFixed(2)}`);
        resolve();
      });
    });
  }

  /**
   * Add multi-site FCC licensing
   */
  async addMultiSiteLicensing(quoteId, siteCount, requiresInterSite) {
    const baseLicensing = 800; // Base FCC licensing
    const additionalSiteCost = 150; // Cost per additional site
    const interSiteFee = requiresInterSite ? 400 : 0; // Inter-site coordination fee

    const totalCost = baseLicensing + ((siteCount - 1) * additionalSiteCost) + interSiteFee;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO quote_items (
          quote_id, part_id, quantity, unit_price, total_price, labor_hours, notes
        ) VALUES (?, NULL, 1, ?, ?, 0, ?)
      `;

      const notes = `FCC licensing: ${siteCount} locations` + (requiresInterSite ? ' with inter-site coordination' : '');

      db.run(sql, [quoteId, totalCost, totalCost, notes], (err) => {
        if (err) return reject(err);
        console.log(`   ✅ Added multi-site licensing: $${totalCost.toFixed(2)}`);
        resolve();
      });
    });
  }

  /**
   * Generate unique quote number
   */
  generateQuoteNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `Q${year}${month}${day}-${random}`;
  }

  /**
   * Format quote for display
   */
  formatQuoteForDisplay(quote) {
    let response = `**FORMAL QUOTE #${quote.quote_number}**\n\n`;
    response += `**Client:** ${quote.client_name}\n`;
    response += `**Industry:** ${quote.industry}\n`;
    response += `**System Type:** ${quote.system_type}\n`;
    response += `**Date:** ${new Date(quote.created_at).toLocaleDateString()}\n\n`;

    response += `**LINE ITEMS:**\n`;
    response += `${''.padEnd(60, '═')}\n`;

    quote.line_items.forEach((item, index) => {
      const itemName = item.part_name || item.notes || 'Service Item';
      const qty = item.quantity;
      const unitPrice = item.unit_price;
      const totalPrice = item.total_price;

      response += `${(index + 1).toString().padStart(2, ' ')}. ${itemName}\n`;
      response += `    Qty: ${qty} × $${unitPrice.toFixed(2)} = $${totalPrice.toFixed(2)}\n`;

      if (item.sku) {
        response += `    SKU: ${item.sku}\n`;
      }

      if (item.labor_hours > 0) {
        response += `    Labor: ${item.labor_hours} hours\n`;
      }
      response += '\n';
    });

    response += `${''.padEnd(60, '─')}\n`;
    response += `**Subtotal (Parts):** $${quote.total_parts.toFixed(2)}\n`;
    response += `**Labor:** $${quote.total_labor.toFixed(2)}\n`;
    response += `**Tax (${(this.taxRate * 100).toFixed(0)}%):** $${quote.total_tax.toFixed(2)}\n`;
    response += `**TOTAL:** $${quote.total_amount.toFixed(2)}\n\n`;

    const pricePerUser = quote.line_items.find(item => item.part_name && item.part_name.includes('radio'));
    if (pricePerUser && pricePerUser.quantity > 1) {
      response += `**Price per user:** $${(quote.total_amount / pricePerUser.quantity).toFixed(2)}\n\n`;
    }

    response += `*This quote is valid for 30 days and includes installation, programming, and basic training.*`;

    return response;
  }
}

module.exports = QuoteBuilder;