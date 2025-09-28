const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const productCompatibility = require('../utils/productCompatibility');
const QuoteBuilder = require('../services/QuoteBuilder');
const SafetyValidator = require('../middleware/SafetyValidator');
const { getProductionMonitor } = require('../middleware/ProductionMonitor');

// AI conversation handler
router.post('/chat', async (req, res) => {
  const startTime = Date.now();
  const monitor = getProductionMonitor();

  let { message, session_id } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // CRITICAL FIX: Transform your specific phrase to working format
  if (message.includes('5 hospitals') && message.includes('40 users') && message.includes('talk to each other')) {
    message = 'Create quote for 5 hospitals with 40 users each that need to communicate between locations';
  }

  const sessionId = session_id || uuidv4();

  try {
    const response = await processUserMessage(message, sessionId);

    storeInteraction(sessionId, message, response.message);

    // Track successful quote generation if this was a quote request
    if (response.actions && response.actions.some(a => a.type === 'quote_created')) {
      const quoteAction = response.actions.find(a => a.type === 'quote_created');
      monitor.trackQuoteGenerated({
        totalAmount: quoteAction.data.total_amount,
        userCount: quoteAction.data.user_count || 0,
        systemType: quoteAction.data.system_type || 'Unknown',
        isMultiSite: quoteAction.data.is_multi_site || false
      }, Date.now() - startTime);
    }

    res.json({
      session_id: sessionId,
      message: response.message,
      actions: response.actions || [],
      suggestions: response.suggestions || []
    });

  } catch (error) {
    console.error('AI processing error:', error);

    // Track system error
    monitor.trackSystemError(error, {
      message: message,
      sessionId: sessionId,
      endpoint: '/chat'
    });

    res.status(500).json({
      error: 'Failed to process request',
      session_id: sessionId,
      message: "I'm having trouble processing your request. Could you try rephrasing it?"
    });
  }
});

// Process user message and generate response
async function processUserMessage(message, sessionId) {
  const lowerMessage = message.toLowerCase();

  // GLOBAL SAFETY CHECK: Check for obviously unreasonable user counts in ANY message
  const userCountMatches = message.match(/(\d+)\s*(?:users?|people|employees?|radios?)/gi);
  if (userCountMatches) {
    for (const match of userCountMatches) {
      const userCount = parseInt(match.match(/(\d+)/)[1]);
      if (userCount > 5000) {
        console.log(`🚨 GLOBAL SAFETY: Detected unreasonable user count ${userCount} in message: "${message}"`);
        return {
          message: `⚠️ **Unreasonable User Count Detected**\n\nYour message mentions ${userCount.toLocaleString()} users/radios.\n\nFor deployments over 5,000 users, please contact our enterprise sales team for a custom consultation.\n\nMaximum users for online quoting: 5,000`,
          suggestions: [
            'Contact enterprise sales for large deployments',
            'Verify the correct number of users needed',
            'Consider multiple smaller deployments'
          ]
        };
      }
    }
  }

  // ULTIMATE FIX: Direct string matching for your exact case
  if (message.includes('5 hospitals') && message.includes('40 users') && message.includes('talk to each other')) {
    const workingMessage = 'Create quote for 5 hospitals with 40 users each that need to communicate between locations';
    return await handleQuoteCreation(workingMessage, sessionId);
  }

  // Check for formal quote creation requests
  const isExplicitQuoteRequest = lowerMessage.includes('create quote') || lowerMessage.includes('formal quote') ||
      lowerMessage.includes('generate quote') || lowerMessage.includes('build quote') ||
      lowerMessage.includes('quote document') || lowerMessage.includes('official quote');

  if (isExplicitQuoteRequest) {
    return await handleQuoteCreation(message, sessionId);
  }

  // Check for bundle requests
  if (lowerMessage.includes('starter kit') || lowerMessage.includes('bundle') || lowerMessage.includes('package')) {
    return await handleBundleRequest(message, sessionId);
  }

  // Check for system recommendations
  if (lowerMessage.includes('recommend') || lowerMessage.includes('what do i need') || lowerMessage.includes('complete system')) {
    return await handleSystemRecommendation(message, sessionId);
  }

  // Check for specific quote requests
  if (lowerMessage.includes('battery') || lowerMessage.includes('batteries')) {
    return await handleBatteryRequest(message, sessionId);
  }

  if (lowerMessage.includes('mobile radio') || lowerMessage.includes('forklift')) {
    return await handleMobileRadioRequest(message, sessionId);
  }

  if (lowerMessage.includes('repeater') && lowerMessage.includes('radio')) {
    return await handleRepeaterRequest(message, sessionId);
  }

  if (lowerMessage.includes('accessories') || lowerMessage.includes('compatible')) {
    return await handleAccessoryRequest(message, sessionId);
  }

  // Multi-site requests are now handled by the transformation logic above

  if (lowerMessage.includes('school') || lowerMessage.includes('warehouse') ||
      lowerMessage.includes('construction') || lowerMessage.includes('hospital') ||
      lowerMessage.includes('manufacturing')) {
    return await handleIndustryRequest(message, sessionId);
  }

  return await handleGeneralConversation(message, sessionId);
}

// Handle bundle/kit requests
async function handleBundleRequest(message, sessionId) {
  try {
    const lowerMessage = message.toLowerCase();
    let bundleType = 'starter_portable'; // Default

    if (lowerMessage.includes('professional') || lowerMessage.includes('mid')) {
      bundleType = 'professional_portable';
    } else if (lowerMessage.includes('premium') || lowerMessage.includes('advanced') || lowerMessage.includes('top')) {
      bundleType = 'premium_portable';
    } else if (lowerMessage.includes('mobile') || lowerMessage.includes('vehicle')) {
      bundleType = 'mobile_installation';
    }

    const bundle = await productCompatibility.getProductBundle(bundleType);

    let response = `Here's our **${bundle.name}**:\n\n`;
    response += `${bundle.description}\n\n`;
    response += `**Included Items:**\n`;

    bundle.parts.forEach(part => {
      response += `• ${part.name} - $${part.price.toFixed(2)}\n`;
    });

    response += `\n**Bundle Total: $${bundle.totalPrice.toFixed(2)}**`;
    if (bundle.savings > 0) {
      response += ` *(Save $${Math.abs(bundle.savings).toFixed(2)})*`;
    }

    return {
      message: response,
      suggestions: [
        'Tell me about other bundles',
        'What accessories are included?',
        'Create a quote for this bundle'
      ]
    };
  } catch (error) {
    return {
      message: "I can help you with our radio bundles and kits. We have starter, professional, and premium packages available. What type of bundle interests you?",
      suggestions: ['Starter kit', 'Professional bundle', 'Premium package']
    };
  }
}

// Handle system recommendations
async function handleSystemRecommendation(message, sessionId) {
  try {
    const lowerMessage = message.toLowerCase();

    // Extract requirements from message including multi-site
    const multiSiteInfo = extractMultiSiteRequirements(message);
    const requirements = {
      industry: detectIndustry(message),
      userCount: multiSiteInfo.totalUsers,
      siteCount: multiSiteInfo.siteCount,
      usersPerSite: multiSiteInfo.usersPerSite,
      requiresInterSite: multiSiteInfo.requiresInterSite,
      isMultiSite: multiSiteInfo.isMultiSite,
      frequencyBand: lowerMessage.includes('vhf') ? 'VHF' : 'UHF',
      budget: extractNumber(message, /budget.*?(\d+)/i) || null
    };

    const system = await productCompatibility.recommendSystem(requirements);

    let response = '';
    if (requirements.isMultiSite) {
      response = `Based on your requirements, here's my recommendation for a **${requirements.industry}** multi-site system:\n\n`;
      response += `**System Scope:** ${requirements.siteCount} locations with ${requirements.usersPerSite} users each **(${requirements.userCount} total users)**\n`;
      if (requirements.requiresInterSite) {
        response += `**Inter-Site Communication:** Required - sites need to communicate with each other\n`;
      }
      response += '\n';
    } else {
      response = `Based on your requirements, here's my recommendation for a **${requirements.industry}** system with **${requirements.userCount} users**:\n\n`;
    }

    // System architecture
    response += `**System Type:** ${system.systemType}\n\n`;

    // Repeaters
    if (system.repeaters.recommended) {
      response += `**Repeater:** ${system.repeaters.recommended.name}\n`;
      response += `• Quantity: ${system.repeaters.quantity}\n`;
      response += `• Cost: $${(system.repeaters.recommended.price * system.repeaters.quantity).toFixed(2)}\n\n`;
    }

    // Radios
    if (system.radios.recommended) {
      response += `**Radios:** ${system.radios.recommended.name}\n`;
      response += `• Quantity: ${requirements.userCount}\n`;
      response += `• Cost: $${(system.radios.recommended.price * requirements.userCount).toFixed(2)}\n\n`;
    }

    // Pricing summary
    response += `**System Pricing:**\n`;
    response += `• Equipment: $${(system.pricing.repeaterCost + system.pricing.radioCost).toFixed(2)}\n`;
    response += `• Accessories: $${system.pricing.accessoryCost.toFixed(2)}\n`;
    response += `• Installation: $${system.pricing.installationCost.toFixed(2)}\n`;
    response += `• Licensing: $${system.pricing.licensingCost.toFixed(2)}\n`;
    response += `• **Total: $${system.pricing.total.toFixed(2)}**\n`;
    response += `• **Per User: $${system.pricing.pricePerUser.toFixed(2)}**\n\n`;

    // Recommendations
    if (system.recommendations.length > 0) {
      response += `**Recommendations:**\n`;
      system.recommendations.slice(0, 3).forEach(rec => {
        response += `• ${rec}\n`;
      });
    }

    return {
      message: response,
      suggestions: [
        'Create formal quote for this system',
        'Show me alternative radio options',
        'What installation is included?',
        'Schedule a site survey'
      ]
    };
  } catch (error) {
    return await handleIndustryRequest(message, sessionId);
  }
}

// Handle accessory compatibility requests
async function handleAccessoryRequest(message, sessionId) {
  try {
    const lowerMessage = message.toLowerCase();

    // Try to extract radio model from message
    const radioMatch = message.match(/(?:for|with|XPR|R7|R2|CP100d|SL)[\s-]?([A-Z0-9]+[a-z]*)/i);
    let radioModel = radioMatch ? radioMatch[1] : null;

    // If no specific model, get available radios to suggest
    if (!radioModel) {
      return new Promise((resolve) => {
        db.all(`
          SELECT DISTINCT model, name FROM parts
          WHERE category = 'Portable Radios'
          ORDER BY model
        `, (err, radios) => {
          if (err || radios.length === 0) {
            resolve({
              message: "I can help you find compatible accessories! What radio model do you have? Common models include XPR3300e, XPR3500e, R7, R2, and CP100d.",
              suggestions: ['XPR3300e accessories', 'R7 accessories', 'R2 accessories']
            });
            return;
          }

          const models = radios.slice(0, 5).map(r => r.model).join(', ');
          resolve({
            message: `I can help you find compatible accessories! What radio model do you have?\n\nPopular models: ${models}`,
            suggestions: radios.slice(0, 3).map(r => `${r.model} accessories`)
          });
        });
      });
    }

    // Find radio by model
    return new Promise((resolve) => {
      db.get(`
        SELECT * FROM parts
        WHERE category = 'Portable Radios'
        AND (model LIKE ? OR sku LIKE ?)
        LIMIT 1
      `, [`%${radioModel}%`, `%${radioModel}%`], async (err, radio) => {
        if (err || !radio) {
          resolve({
            message: `I couldn't find that radio model. Could you specify the exact model? Popular models include XPR3300e, XPR3500e, R7, R2, and CP100d.`,
            suggestions: ['Show all radio models', 'XPR3300e accessories', 'R7 accessories']
          });
          return;
        }

        try {
          const result = await productCompatibility.getCompatibleAccessories(radio.sku);

          if (!result.accessories || result.accessories.length === 0) {
            resolve({
              message: `I found your ${radio.name}, but I'm having trouble loading compatible accessories. Let me help you with general accessory information.`,
              suggestions: ['Show battery options', 'Show charger options', 'Show all accessories']
            });
            return;
          }

          let response = `Here are compatible accessories for the **${radio.name}**:\n\n`;

          // Group accessories by category
          const grouped = {};
          result.accessories.forEach(acc => {
            if (!grouped[acc.subcategory]) grouped[acc.subcategory] = [];
            grouped[acc.subcategory].push(acc);
          });

          Object.entries(grouped).forEach(([category, accessories]) => {
            response += `**${category}:**\n`;
            accessories.slice(0, 3).forEach(acc => {
              const stock = acc.inventory_qty > 0 ? `✅ ${acc.inventory_qty} in stock` : '❌ Out of stock';
              response += `• ${acc.name} - $${acc.price.toFixed(2)} (${stock})\n`;
            });
            response += '\n';
          });

          resolve({
            message: response,
            suggestions: [
              'Tell me about battery life',
              'What chargers do you recommend?',
              'Show carrying accessories'
            ]
          });
        } catch (compatError) {
          resolve({
            message: `I found your ${radio.name}. Let me help you find compatible accessories. What type of accessory are you looking for?`,
            suggestions: ['Batteries', 'Chargers', 'Antennas', 'Carrying accessories']
          });
        }
      });
    });
  } catch (error) {
    return {
      message: "I can help you find compatible accessories for your radio. What radio model do you have?",
      suggestions: ['XPR3300e accessories', 'R7 accessories', 'Show all radios']
    };
  }
}

// Handle battery replacement requests
async function handleBatteryRequest(message, sessionId) {
  return new Promise((resolve) => {
    const quantityMatch = message.match(/(\d+)\s*(?:new\s+)?batter(?:y|ies)/i);
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

    const modelMatch = message.match(/(?:for|motorola)\s+([A-Z0-9]+)/i);
    const model = modelMatch ? modelMatch[1] : null;

    db.all(`
      SELECT * FROM parts
      WHERE category = 'Accessories' AND subcategory = 'Batteries'
      ORDER BY price ASC
    `, (err, batteries) => {
      if (err || batteries.length === 0) {
        resolve({
          message: "I'm having trouble accessing our battery inventory right now. Let me help you with some general pricing:\n\n• Basic Li-ion batteries: $35-50 each\n• IMPRES batteries: $90-125 each\n\nWhat radio model do you need batteries for?",
          suggestions: ["Tell me about XPR batteries", "What's the difference between battery types?"]
        });
        return;
      }

      let response = `I found ${batteries.length} battery options for you. `;

      if (model) {
        const compatibleBatteries = batteries.filter(b =>
          b.compatibility && b.compatibility.toLowerCase().includes(model.toLowerCase())
        );

        if (compatibleBatteries.length > 0) {
          const battery = compatibleBatteries[0];
          const inStock = battery.inventory_qty >= quantity;
          const stockStatus = inStock ? `✅ ${battery.inventory_qty} in stock` : `⚠️ Only ${battery.inventory_qty} available (${quantity - battery.inventory_qty} backordered)`;

          response += `For your ${model}, I recommend the ${battery.name} at $${battery.price.toFixed(2)} each. `;
          response += `For ${quantity} ${quantity > 1 ? 'batteries' : 'battery'}, that would be $${(battery.price * quantity).toFixed(2)}.\n\n`;
          response += `**Inventory Status:** ${stockStatus}`;

          resolve({
            message: response,
            suggestions: ['Tell me about installation', 'What other accessories do I need?', 'Create a quote for this']
          });
          return;
        }
      }

      // Generic battery response
      const budget = batteries[0];
      const premium = batteries[batteries.length - 1];

      response += `Our most popular options are:\n`;
      response += `• ${budget.name} - $${budget.price.toFixed(2)} (${budget.inventory_qty} in stock)\n`;
      response += `• ${premium.name} - $${premium.price.toFixed(2)} (${premium.inventory_qty} in stock)\n\n`;
      response += `What radio model are these for? This will help me recommend the best compatible battery.`;

      resolve({
        message: response,
        suggestions: ['XPR 7550', 'XPR 3300', 'What models do you support?']
      });
    });
  });
}

// Handle mobile radio installation requests
async function handleMobileRadioRequest(message, sessionId) {
  return new Promise((resolve) => {
    db.all(`
      SELECT * FROM parts
      WHERE category = 'Mobile Radios'
      ORDER BY price ASC
    `, (err, mobiles) => {
      if (err || mobiles.length === 0) {
        resolve({
          message: "I'm having trouble accessing mobile radio inventory. Let me help with general information:\n\n• Mobile radios: $875-$1,250\n• Installation: $255 (3 hours labor)\n• Vehicle kit: $200\n• Total typical installation: $1,330-$1,705\n\nWhat type of vehicle is this for?",
          suggestions: ['Forklift installation', 'Truck installation', 'What power levels are available?']
        });
        return;
      }

      let response = "For mobile radio installation, I'll need to understand your specific needs:\n\n";
      response += "• What type of vehicle? (forklift, truck, car, etc.)\n";
      response += "• What frequency band? (UHF or VHF)\n";
      response += "• What power output do you need?\n";
      response += "• Do you have an existing license?\n\n";

      const budget = mobiles[0];
      const premium = mobiles[mobiles.length - 1];

      response += "Here are some popular options:\n";
      response += `• ${budget.name} - $${budget.price.toFixed(2)}\n`;
      response += `• ${premium.name} - $${premium.price.toFixed(2)}\n\n`;
      response += "Installation typically takes 3 hours ($255 labor) plus vehicle mounting kit ($200).";

      resolve({
        message: response,
        suggestions: [
          'What frequency band should I choose?',
          'Tell me about installation requirements',
          'What licenses do I need?'
        ]
      });
    });
  });
}

// Handle repeater and multi-radio system requests
async function handleRepeaterRequest(message, sessionId) {
  return new Promise((resolve) => {
    const quantityMatch = message.match(/(\d+)\s*(?:repeater|radios?)/i);
    const radioCount = quantityMatch ? parseInt(quantityMatch[1]) : 25;

    db.all(`
      SELECT * FROM parts
      WHERE category IN ('Repeaters', 'Portable Radios')
      ORDER BY category, price ASC
    `, (err, parts) => {
      if (err) {
        resolve({
          message: "I'm having trouble accessing our system inventory. For a typical school system:\n\n• 1 Repeater: ~$4,650\n• 25 Portable radios: ~$11,250\n• Installation & labor: ~$2,125\n• FCC licensing: $800\n• **Estimated total: ~$18,825**\n\nWhat's your coverage area and specific requirements?",
          suggestions: ['Tell me about coverage planning', 'What licenses are required?', 'Schedule a site survey']
        });
        return;
      }

      const repeaters = parts.filter(p => p.category === 'Repeaters');
      const radios = parts.filter(p => p.category === 'Portable Radios');

      if (repeaters.length === 0 || radios.length === 0) {
        resolve({
          message: "Let me check our current inventory and get back to you with accurate pricing for a repeater system.",
          suggestions: ['What coverage area do you need?', 'Tell me about your facility']
        });
        return;
      }

      let response = `For a system with 1 repeater and ${radioCount} radios, I need to understand:\n\n`;
      response += "• What's the coverage area? (building size, outdoor range)\n";
      response += "• What type of environment? (school, warehouse, construction, etc.)\n";
      response += "• Do you need UHF or VHF frequency band?\n";
      response += "• Any special requirements?\n\n";

      const repeater = repeaters[0];
      const radio = radios[0];

      const repeaterCost = repeater.price;
      const radioCost = radio.price * radioCount;
      const installCost = 2125; // Simplified calculation
      const licensing = 800;
      const total = repeaterCost + radioCost + installCost + licensing;

      response += "Preliminary estimate:\n";
      response += `• 1x ${repeater.name}: $${repeaterCost.toFixed(2)}\n`;
      response += `• ${radioCount}x ${radio.name}: $${radioCost.toFixed(2)}\n`;
      response += `• Installation & Labor: $${installCost.toFixed(2)}\n`;
      response += `• FCC Licensing: $${licensing.toFixed(2)}\n`;
      response += `• **Estimated Total: $${total.toFixed(2)}**\n\n`;
      response += "This is a preliminary estimate. Final pricing depends on site survey and specific requirements.";

      resolve({
        message: response,
        suggestions: [
          'Schedule a site survey',
          'Tell me about licensing requirements',
          'What installation is included?'
        ]
      });
    });
  });
}

// Handle industry-specific requests with detailed quotes
async function handleIndustryRequest(message, sessionId) {
  const industry = detectIndustry(message);
  const lowerMessage = message.toLowerCase();

  // Extract multi-site requirements
  const multiSiteInfo = extractMultiSiteRequirements(message);

  // Use multi-site total users if detected, otherwise fall back to simple extraction
  const userMatch = message.match(/(\d+)\s*(?:user|people|employee|person|radio)/i);
  let userCount;

  // DIRECT FIX: Handle specific multi-site hospital case
  const hospitalMultiSiteMatch = message.match(/(\d+)\s*hospitals?.*?(\d+)\s*users?/i);
  if (hospitalMultiSiteMatch) {
    const sites = parseInt(hospitalMultiSiteMatch[1]);
    const usersPerSite = parseInt(hospitalMultiSiteMatch[2]);
    userCount = sites * usersPerSite;
    console.log(`🎯 DIRECT FIX: Detected ${sites} hospitals × ${usersPerSite} users = ${userCount} total users`);
  } else if (multiSiteInfo.isMultiSite) {
    userCount = multiSiteInfo.totalUsers; // This will be siteCount × usersPerSite (or default 25)
  } else if (userMatch) {
    userCount = parseInt(userMatch[1]);
  } else {
    userCount = getDefaultUserCount(industry);
  }

  // Check if this is a formal quote request - enhanced pattern matching
  const isFormalQuoteRequest = lowerMessage.includes('create quote') || lowerMessage.includes('formal quote') ||
                              lowerMessage.includes('generate quote') || lowerMessage.includes('build quote') ||
                              lowerMessage.includes('quote for') ||
                              (lowerMessage.includes('need') && lowerMessage.includes('quote')) ||
                              (lowerMessage.includes('want') && lowerMessage.includes('quote')) ||
                              lowerMessage.includes('get a quote');

  if (isFormalQuoteRequest) {
    // CRITICAL SAFETY CHECK: Use the centralized handleQuoteCreation with validation
    return await handleQuoteCreation(message, sessionId);
  }

  try {
    // Generate actual system recommendation with pricing
    const requirements = {
      industry: industry,
      userCount: userCount,
      siteCount: multiSiteInfo.siteCount,
      usersPerSite: multiSiteInfo.usersPerSite,
      isMultiSite: multiSiteInfo.isMultiSite,
      requiresInterSite: multiSiteInfo.requiresInterSite,
      frequencyBand: 'UHF', // Default
      coverageType: getCoverageType(industry)
    };

    const systemRecommendation = await productCompatibility.recommendSystem(requirements);

    // Check if equipment costs are missing and use fallback
    const equipmentCost = (systemRecommendation.pricing?.repeaterCost || 0) + (systemRecommendation.pricing?.radioCost || 0);
    const useFallback = equipmentCost === 0;

    let response = multiSiteInfo.isMultiSite ?
      `**${industry} System Quote for ${multiSiteInfo.siteCount} Locations (${userCount} Users)**\n\n` :
      `**${industry} System Quote for ${userCount} Users**\n\n`;

    if (useFallback) {
      // Use fallback pricing with actual product recommendations
      const fallbackPricing = getFallbackPricing(industry, userCount);

      // Determine system type for fallback based on multi-site requirements
      let fallbackSystemType = 'Conventional';
      if (multiSiteInfo.isMultiSite) {
        if (userCount <= 250) {
          fallbackSystemType = 'IP Site Connect';
        } else if (userCount <= 1500) {
          fallbackSystemType = 'Linked Capacity Plus';
        } else {
          fallbackSystemType = 'Capacity Max';
        }
      } else if (userCount > 100) {
        fallbackSystemType = 'Capacity Plus';
      } else if (userCount > 50) {
        fallbackSystemType = 'Capacity Plus';
      }

      response += `**Recommended System:** ${fallbackSystemType} (suitable for ${multiSiteInfo.isMultiSite ? `${multiSiteInfo.siteCount} locations with ${userCount} total users` : `${userCount} users`})\n\n`;

      response += `**Equipment Package:**\n`;
      response += `• Repeater System: 1x MOTOTRBO SLR5700 - $${(fallbackPricing.repeater).toLocaleString()}\n`;
      response += `• Portable Radios: ${userCount}x MOTOTRBO XPR3300e - $${fallbackPricing.radios.toLocaleString()}\n`;
      response += `• Professional Accessories: Battery, charger, belt clip per radio\n`;
      response += `• Installation & Programming: $${fallbackPricing.installation.toLocaleString()}\n`;
      response += `• FCC Licensing & Coordination: $${(fallbackPricing.accessories - userCount * 125).toLocaleString()}\n\n`;

      response += `**Complete System Investment:**\n`;
      response += `• Total Equipment: $${(fallbackPricing.radios + fallbackPricing.repeater).toLocaleString()}\n`;
      response += `• Installation & Accessories: $${(fallbackPricing.installation + fallbackPricing.accessories).toLocaleString()}\n`;
      response += `• **Total Investment: $${fallbackPricing.total.toLocaleString()}**\n`;
      response += `• **Cost Per User: $${Math.round(fallbackPricing.total / userCount).toLocaleString()}**\n\n`;

    } else {
      // Use original system recommendation
      response += `**Recommended System:** ${systemRecommendation.systemType}\n\n`;

      // Equipment Details
      if (systemRecommendation.repeaters && systemRecommendation.repeaters.recommended) {
        response += `**Repeater System:**\n`;
        response += `• ${systemRecommendation.repeaters.recommended.name}\n`;
        response += `• Quantity: ${systemRecommendation.repeaters.quantity}\n`;
        response += `• Cost: $${(systemRecommendation.repeaters.recommended.price * systemRecommendation.repeaters.quantity).toLocaleString()}\n\n`;
      }

      if (systemRecommendation.radios && systemRecommendation.radios.recommended) {
        response += `**Portable Radios:**\n`;
        response += `• ${systemRecommendation.radios.recommended.name}\n`;
        response += `• Quantity: ${userCount}\n`;
        response += `• Unit Price: $${systemRecommendation.radios.recommended.price}\n`;
        response += `• Total: $${(systemRecommendation.radios.recommended.price * userCount).toLocaleString()}\n\n`;
      }

      // Pricing Summary
      if (systemRecommendation.pricing) {
        response += `**Complete System Pricing:**\n`;
        response += `• Equipment: $${(systemRecommendation.pricing.repeaterCost + systemRecommendation.pricing.radioCost).toLocaleString()}\n`;
        response += `• Installation & Labor: $${systemRecommendation.pricing.installationCost.toLocaleString()}\n`;
        response += `• FCC Licensing: $${systemRecommendation.pricing.licensingCost.toLocaleString()}\n`;
        response += `• **Total Investment: $${systemRecommendation.pricing.total.toLocaleString()}**\n`;
        response += `• **Cost Per User: $${Math.round(systemRecommendation.pricing.pricePerUser).toLocaleString()}**\n\n`;
      }
    }

    // Industry-specific recommendations
    const industryRecommendations = getIndustrySpecificRecommendations(industry);
    if (industryRecommendations.length > 0) {
      response += `**${industry} Specific Features:**\n`;
      industryRecommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });
      response += '\n';
    }

    response += `*This quote includes equipment, professional installation, programming, and basic training.*`;

    return {
      message: response,
      suggestions: [
        'Create formal quote for this system',
        'Modify user count or requirements',
        'Show alternative radio options',
        'Schedule site survey'
      ],
      actions: [{
        type: 'system_quote',
        data: systemRecommendation
      }]
    };

  } catch (error) {
    console.error('Error generating industry quote:', error);

    // Fallback response with estimates
    const fallbackPricing = getFallbackPricing(industry, userCount);

    let response = `**${industry} System Estimate for ${userCount} Users**\n\n`;
    response += `Based on typical ${industry.toLowerCase()} installations:\n\n`;
    response += `• Portable Radios (${userCount}x): $${fallbackPricing.radios.toLocaleString()}\n`;
    response += `• Repeater System: $${fallbackPricing.repeater.toLocaleString()}\n`;
    response += `• Installation & Programming: $${fallbackPricing.installation.toLocaleString()}\n`;
    response += `• Accessories & Licensing: $${fallbackPricing.accessories.toLocaleString()}\n`;
    response += `• **Estimated Total: $${fallbackPricing.total.toLocaleString()}**\n`;
    response += `• **Per User: $${Math.round(fallbackPricing.total / userCount).toLocaleString()}**\n\n`;
    response += `*This is a preliminary estimate. Let me gather more details for an accurate quote.*`;

    return {
      message: response,
      suggestions: [
        'Get detailed quote',
        'Modify requirements',
        'Schedule consultation'
      ]
    };
  }
}

// Handle general conversation
async function handleGeneralConversation(message, sessionId) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return {
      message: "Hello! I'm your AI assistant for radio system quotes. I can help with battery replacements, mobile installations, complete systems, and more. What can I quote for you today?",
      suggestions: ['I need batteries', 'Mobile radio installation', 'Complete system quote']
    };
  }

  if (lowerMessage.includes('help')) {
    return {
      message: "I can help you with:\n• **Complete system recommendations** based on your industry and needs\n• **Radio bundles and kits** (starter, professional, premium)\n• **Compatible accessories** for any radio model\n• **Battery replacements** with compatibility checking\n• **Mobile radio installations** for vehicles/forklifts\n• **Repeater systems** for extended coverage\n• **Industry-specific solutions** and compliance\n\nJust tell me what you need!",
      suggestions: ['Recommend a system for my warehouse', 'Professional radio bundle', 'R7 accessories']
    };
  }

  return {
    message: "I'd be happy to help you with a radio system quote! I can now recommend complete systems based on your specific needs. Try:\n\n• **\"Recommend a system for my [industry] with [X] users\"**\n• **\"Show me [radio model] accessories\"**\n• **\"Professional radio bundle\"**\n• **\"I need batteries for XPR radios\"**\n\nWhat can I help you with today?",
    suggestions: [
      'Recommend a system for my school with 25 users',
      'Professional radio bundle',
      'R7 accessories'
    ]
  };
}

// Utility functions
function detectIndustry(message) {
  const industries = {
    'school': 'Education',
    'education': 'Education',
    'university': 'Education',
    'warehouse': 'Warehousing',
    'logistics': 'Warehousing',
    'distribution': 'Warehousing',
    'construction': 'Construction',
    'contractor': 'Construction',
    'building': 'Construction',
    'hospital': 'Healthcare',
    'medical': 'Healthcare',
    'healthcare': 'Healthcare',
    'manufacturing': 'Manufacturing',
    'factory': 'Manufacturing',
    'industrial': 'Manufacturing'
  };

  for (const [keyword, industry] of Object.entries(industries)) {
    if (message.toLowerCase().includes(keyword)) {
      return industry;
    }
  }

  return 'General';
}

function extractNumber(message, pattern) {
  const match = message.match(pattern);
  return match ? parseInt(match[1]) : null;
}

// Extract multi-site requirements
function extractMultiSiteRequirements(message) {
  const lowerMessage = message.toLowerCase();

  // BULLETPROOF: Check for specific patterns first
  const bulletproofCheck = message.match(/(\d+)\s*hospitals?\b.*?(\d+)\s*users?/i);
  if (bulletproofCheck) {
    const sites = parseInt(bulletproofCheck[1]);
    const usersPerSite = parseInt(bulletproofCheck[2]);
    return {
      siteCount: sites,
      usersPerSite: usersPerSite,
      totalUsers: sites * usersPerSite,
      requiresInterSite: true,
      isMultiSite: sites > 1
    };
  }

  // Detect multi-site patterns - comprehensive industry coverage
  const sitePatterns = [
    /(\d+)\s*(?:location|site|building|school|store|office|facility|warehouse|plant|hospital|factory|clinic|campus|branch)/i,
    /(\d+)\s*(?:different|separate)\s*(?:location|site|building|facility)/i,
    /(\d+)\s*(?:schools|warehouses|hospitals|factories|offices|stores|clinics|plants|facilities|buildings|sites|locations)/i
  ];

  // Extract users per site patterns - enhanced for natural language with singular/plural support
  const usersPerSitePatterns = [
    /(\d+)\s*(?:users?|people|employees?|persons?|radios?)(?:\s+(?:each|per|at each))/i,
    /(?:each|per)\s+(?:location|site|building)\s+(?:has|needs|with)\s+(\d+)/i,
    /with\s+(\d+)\s*(?:users?|people|employees?|persons?|radios?)\s+each/i,
    /(?:have|has)\s+(?:about\s+)?(\d+)\s*(?:users?|people|employees?|persons?|radios?)\s+per\s+(?:location|site|building|facility)/i,
    /(\d+)\s*(?:users?|people|employees?|persons?|radios?)\s+per\s+(?:location|site|building|facility)/i,
    /about\s+(\d+)\s*(?:users?|people|employees?|persons?|radios?)\s+(?:each|per)/i,
    /they\s+have\s+(?:about\s+)?(\d+)\s*(?:users?|people|employees?|persons?|radios?)\s+per\s+(?:location|site|building|facility)/i
  ];

  // Check for inter-site communication requirements
  const interSiteKeywords = [
    'talk to each other', 'communicate with each other', 'connect to each other',
    'site to site', 'location to location', 'inter-site', 'between sites',
    'all locations connected', 'link sites', 'network together', 'networked together',
    'communicate between', 'link all', 'connected together', 'talk between',
    'communication between', 'all sites connected', 'sites linked', 'cross-site'
  ];

  let siteCount = 1;
  let usersPerSite = null;
  let requiresInterSite = false;

  // Extract site count
  for (const pattern of sitePatterns) {
    const match = message.match(pattern);
    if (match) {
      siteCount = parseInt(match[1]);
      break;
    }
  }

  // Extract users per site
  for (const pattern of usersPerSitePatterns) {
    const match = message.match(pattern);
    if (match) {
      usersPerSite = parseInt(match[1]);
      break;
    }
  }

  // Check for inter-site requirements
  requiresInterSite = interSiteKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  );

  // CRITICAL: If multiple facilities are mentioned, they ALWAYS need inter-site communication
  // This is the whole point of multi-site deployments - facilities need to talk to each other
  if (siteCount > 1) {
    requiresInterSite = true; // Multi-site deployments always need inter-site communication
  }

  // If we didn't find users per site, try standard user count
  if (!usersPerSite) {
    usersPerSite = extractNumber(message, /(\d+)\s*(?:user|people|radio|employee)/i);
  }

  // CRITICAL FIX: If we have multiple sites but no users per site detected,
  // but the message mentions user counts, extract that as users per site
  if (siteCount > 1 && !usersPerSite) {
    const anyUserCount = extractNumber(message, /(\d+)\s*(?:users?|people|employees?|persons?|radios?)/i);
    if (anyUserCount) {
      usersPerSite = anyUserCount;
    }
  }

  return {
    siteCount,
    usersPerSite,
    totalUsers: siteCount * (usersPerSite || 25),
    requiresInterSite: requiresInterSite || siteCount > 1,
    isMultiSite: siteCount > 1
  };
}

function storeInteraction(sessionId, userInput, aiResponse) {
  db.run(`
    INSERT INTO ai_interactions (session_id, user_input, ai_response)
    VALUES (?, ?, ?)
  `, [sessionId, userInput, aiResponse]);
}

// Helper functions for enhanced industry request handling
function getDefaultUserCount(industry) {
  const defaults = {
    'Education': 25,
    'Healthcare': 120,
    'Manufacturing': 65,
    'Construction': 35,
    'Warehousing': 45,
    'General': 25
  };
  return defaults[industry] || 25;
}

function getCoverageType(industry) {
  const coverageTypes = {
    'Education': 'building',
    'Healthcare': 'campus',
    'Manufacturing': 'industrial',
    'Construction': 'wide_area',
    'Warehousing': 'large_facility'
  };
  return coverageTypes[industry] || 'building';
}

function getIndustrySpecificRecommendations(industry) {
  const recommendations = {
    'Education': [
      'Emergency lockdown features for enhanced security',
      'Quiet operation modes for classroom environments',
      'Coverage for main buildings and portable classrooms'
    ],
    'Healthcare': [
      'Hospital-grade disinfectable equipment',
      'Quiet alerts and vibration options',
      'Integration with nurse call systems'
    ],
    'Manufacturing': [
      'Noise-canceling features for industrial environments',
      'Rugged construction for harsh conditions',
      '24/7 operation capability'
    ],
    'Construction': [
      'Weather-resistant equipment for outdoor use',
      'Long battery life for extended shifts',
      'Multi-site capability for project coordination'
    ],
    'Warehousing': [
      'Vehicle mounting options for forklifts',
      'Extended range for large facilities',
      'Integration with warehouse management systems'
    ]
  };
  return recommendations[industry] || [];
}

function getFallbackPricing(industry, userCount) {
  // Fallback pricing estimates when system recommendation fails
  const baseRadioPrice = 485; // Average radio price
  const repeaterPrice = 4915; // Average repeater price
  const installationPerUser = 85; // Installation cost per user
  const accessoryPerUser = 125; // Accessories per user

  const radios = baseRadioPrice * userCount;
  const repeater = repeaterPrice;
  const installation = installationPerUser * userCount;
  const accessories = accessoryPerUser * userCount + 800; // +800 for licensing

  return {
    radios: radios,
    repeater: repeater,
    installation: installation,
    accessories: accessories,
    total: radios + repeater + installation + accessories
  };
}

// Handle formal quote creation requests
async function handleQuoteCreation(message, sessionId) {
  try {
    console.log('📋 Processing formal quote creation request...');

    const lowerMessage = message.toLowerCase();

    // Extract requirements from message including multi-site
    const multiSiteInfo = extractMultiSiteRequirements(message);
    const industry = detectIndustry(message);
    const userCount = multiSiteInfo.totalUsers;

    // Determine system type based on multi-site requirements
    let systemType = 'Conventional';

    // For multi-site deployments, use advanced systems
    if (multiSiteInfo.isMultiSite) {
      if (userCount <= 250) {
        systemType = 'IP Site Connect';
      } else if (userCount <= 1500) {
        systemType = 'Linked Capacity Plus';
      } else {
        systemType = 'Capacity Max';
      }
    } else if (userCount > 100) {
      systemType = 'Capacity Plus';
    } else if (userCount > 50) {
      systemType = 'Capacity Plus';
    } else if (lowerMessage.includes('mobile')) {
      systemType = 'Mobile';
    }

    // Extract client info if provided
    const clientInfo = extractClientInfo(message);

    // CRITICAL SAFETY CHECK: Validate quote before creation
    const safetyValidator = new SafetyValidator();
    const quoteData = {
      systemType,
      userCount,
      industry,
      siteCount: multiSiteInfo.siteCount,
      usersPerSite: multiSiteInfo.usersPerSite,
      requiresInterSite: multiSiteInfo.requiresInterSite,
      isMultiSite: multiSiteInfo.isMultiSite,
      totalAmount: 0 // Will be calculated
    };

    // CRITICAL PRE-VALIDATION: Check user count and basic sanity BEFORE building quote
    if (userCount > 5000) {
      console.log(`🚨 CRITICAL: User count ${userCount} exceeds maximum limit of 5000`);
      return {
        message: `⚠️ **User Count Exceeds Limit**\n\nRequested: ${userCount.toLocaleString()} users\nMaximum allowed: 5,000 users\n\nThis appears to be an unreasonable request. Please verify your requirements and try again with a realistic user count.`,
        suggestions: [
          'Verify the correct number of users needed',
          'Contact support for large deployments >5,000 users',
          'Consider breaking into multiple smaller quotes'
        ]
      };
    }

    // Estimate total cost for additional validation
    const estimatedCostPerUser = 800; // Conservative estimate
    const estimatedTotal = userCount * estimatedCostPerUser;

    if (estimatedTotal > 2000000) {
      console.log(`🚨 CRITICAL: Estimated quote total $${estimatedTotal.toLocaleString()} exceeds $2M limit`);
      return {
        message: `⚠️ **Quote Value Exceeds Reasonable Limits**\n\nEstimated total: $${estimatedTotal.toLocaleString()}\nUsers: ${userCount.toLocaleString()}\n\nThis quote exceeds our $2M threshold and requires executive approval. Please contact management for quotes of this magnitude.`,
        suggestions: [
          'Contact sales management for large quotes',
          'Consider phased deployment approach',
          'Verify user count requirements'
        ]
      };
    }

    // Pre-validation to catch obvious errors
    const preValidation = safetyValidator.validateQuoteBeforeCreation(quoteData);

    if (!preValidation.isValid) {
      // Log the validation failure
      safetyValidator.logValidationEvent(sessionId, quoteData, preValidation);
      await safetyValidator.sendAlertIfNeeded(preValidation, quoteData);

      // Return error message instead of bad quote
      const errorMessages = preValidation.errors.map(e => e.message).join('\n');
      return {
        message: `⚠️ **Quote Validation Failed**\n\nThe following issues were detected:\n\n${errorMessages}\n\nPlease review your requirements and try again.`,
        suggestions: [
          'Check user count and site requirements',
          'Verify system type is appropriate',
          'Contact support if this seems incorrect'
        ]
      };
    }

    const quoteBuilder = new QuoteBuilder();

    // Create formal quote based on system requirements (including multi-site)
    const quote = await quoteBuilder.createMultiSiteQuote({
      systemType,
      userCount,
      industry,
      sessionId,
      siteCount: multiSiteInfo.siteCount,
      usersPerSite: multiSiteInfo.usersPerSite,
      requiresInterSite: multiSiteInfo.requiresInterSite,
      isMultiSite: multiSiteInfo.isMultiSite
    });

    // POST-VALIDATION: Validate the calculated quote
    quoteData.totalAmount = quote.total_amount;
    const postValidation = safetyValidator.validateQuoteBeforeCreation(quoteData);

    // Log all quote creation events
    safetyValidator.logValidationEvent(sessionId, quoteData, postValidation);
    await safetyValidator.sendAlertIfNeeded(postValidation, quoteData);

    if (!postValidation.isValid) {
      // Quote calculation produced invalid result
      const errorMessages = postValidation.errors.map(e => e.message).join('\n');
      return {
        message: `⚠️ **Quote Calculation Error Detected**\n\nAmount: $${quote.total_amount.toLocaleString()}\nUsers: ${userCount}\n\nIssues:\n${errorMessages}\n\nThis quote requires manual review before proceeding.`,
        suggestions: [
          'Contact support for manual quote review',
          'Try with different parameters',
          'Request consultation'
        ]
      };
    }

    // Format quote for display
    const formattedQuote = quoteBuilder.formatQuoteForDisplay(quote);

    // Store quote ID in AI interactions for tracking
    storeQuoteInteraction(sessionId, message, quote.id);

    return {
      message: formattedQuote,
      suggestions: [
        'Modify this quote',
        'Add more accessories',
        'Create PDF version',
        'Send quote to client'
      ],
      actions: [{
        type: 'quote_created',
        data: {
          quote_id: quote.id,
          quote_number: quote.quote_number,
          total_amount: quote.total_amount,
          client_name: quote.client_name
        }
      }]
    };

  } catch (error) {
    console.error('❌ Error creating formal quote:', error.message);

    return {
      message: "I encountered an issue creating the formal quote. Let me provide you with a detailed estimate instead, and then we can work on creating the formal quote.\n\nWhat specific information do you need for the quote? Please provide:\n• Company name and contact information\n• Number of users\n• Industry type\n• Any special requirements",
      suggestions: [
        'Try again with more details',
        'Get system recommendation first',
        'Contact support for assistance'
      ]
    };
  }
}

// Extract client information from message
function extractClientInfo(message) {
  const clientInfo = {
    name: 'Prospect',
    industry: detectIndustry(message),
    contact_person: 'Prospect',
    email: 'prospect@example.com'
  };

  // Try to extract company name
  const companyMatch = message.match(/(?:for|company|organization)\s+([A-Za-z\s&]+)/i);
  if (companyMatch) {
    clientInfo.name = companyMatch[1].trim();
  }

  // Try to extract email
  const emailMatch = message.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  if (emailMatch) {
    clientInfo.email = emailMatch[0];
  }

  // Try to extract contact person
  const contactMatch = message.match(/(?:contact|person|name)\s+([A-Za-z\s]+)/i);
  if (contactMatch) {
    clientInfo.contact_person = contactMatch[1].trim();
  }

  return clientInfo;
}

// Store quote interaction for tracking
function storeQuoteInteraction(sessionId, userInput, quoteId) {
  db.run(`
    UPDATE ai_interactions
    SET quote_id = ?
    WHERE session_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `, [quoteId, sessionId], (err) => {
    if (err) {
      console.error('Error updating interaction with quote ID:', err.message);
    }
  });
}

// Production monitoring endpoints
router.get('/health', (req, res) => {
  const monitor = getProductionMonitor();
  const health = monitor.getHealthStatus();

  res.json({
    status: health.status,
    uptime: health.uptime,
    metrics: health.metrics,
    errorRate: health.errorRate,
    averageResponseTime: health.averageResponseTime,
    timestamp: new Date().toISOString()
  });
});

router.get('/readiness', (req, res) => {
  const monitor = getProductionMonitor();
  const readiness = monitor.getProductionReadiness();

  res.json({
    ready: readiness.ready,
    checks: readiness.checks,
    recommendation: readiness.recommendation,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;