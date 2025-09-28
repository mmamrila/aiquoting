const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const LearningEngine = require('./learning-engine');
const productCompatibility = require('../utils/productCompatibility');

const learningEngine = new LearningEngine();

/**
 * Enhanced AI Chat Handler with Learning Capabilities
 */
router.post('/chat', async (req, res) => {
  const { message, session_id, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const sessionId = session_id || uuidv4();

  try {
    // Enhanced message processing with learning
    const response = await processEnhancedMessage(message, sessionId, context);

    // Store enhanced interaction
    await storeEnhancedInteraction(sessionId, message, response);

    res.json({
      session_id: sessionId,
      message: response.message,
      actions: response.actions || [],
      suggestions: response.suggestions || [],
      learning_applied: response.learning_applied || [],
      confidence: response.confidence || 0.8,
      products_discussed: response.products_discussed || [],
      intent: response.intent || 'general'
    });

  } catch (error) {
    console.error('Enhanced AI processing error:', error);
    res.status(500).json({
      error: 'Failed to process request',
      session_id: sessionId,
      message: "I'm having trouble processing your request. Could you try rephrasing it?"
    });
  }
});

/**
 * Record quote outcome for learning
 */
router.post('/learn-from-quote', async (req, res) => {
  const { quote_id, outcome, feedback } = req.body;

  if (!quote_id || !outcome) {
    return res.status(400).json({ error: 'Quote ID and outcome are required' });
  }

  try {
    // Store quote outcome
    await storeQuoteOutcome(quote_id, outcome, feedback);

    // Learn from the outcome if it was successful
    if (outcome.outcome === 'won') {
      await learningEngine.learnFromSuccessfulQuote(quote_id, outcome);
    }

    res.json({
      success: true,
      message: 'Learning completed successfully',
      quote_id: quote_id
    });

  } catch (error) {
    console.error('Learning error:', error);
    res.status(500).json({
      error: 'Failed to process learning',
      message: 'Could not learn from this quote outcome'
    });
  }
});

/**
 * Get AI insights and recommendations
 */
router.get('/insights/:industry/:userCount', async (req, res) => {
  const { industry, userCount } = req.params;

  try {
    const insights = await getAIInsights(industry, parseInt(userCount));
    res.json(insights);

  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      error: 'Failed to generate insights'
    });
  }
});

/**
 * Record user feedback for learning
 */
router.post('/feedback', async (req, res) => {
  const { session_id, satisfaction, improvement_area, follow_up_required } = req.body;

  if (!session_id || satisfaction === undefined) {
    return res.status(400).json({ error: 'Session ID and satisfaction rating are required' });
  }

  try {
    await learningEngine.recordUserFeedback(session_id, {
      satisfaction,
      improvement_area,
      follow_up_required
    });

    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({
      error: 'Failed to record feedback'
    });
  }
});

/**
 * Enhanced message processing with learning and intelligence
 */
async function processEnhancedMessage(message, sessionId, context = {}) {
  const lowerMessage = message.toLowerCase();

  // Classify intent using enhanced patterns
  const intent = classifyIntent(message);

  // Extract entities (products, quantities, industries, etc.)
  const entities = extractEntities(message);

  // Get relevant learning patterns
  const learningPatterns = await learningEngine.getRelevantPatterns(
    entities.industry || context.industry,
    entities.user_count || context.user_count,
    intent
  );

  // Process based on intent with learning enhancement
  let response;
  switch (intent) {
    case 'system_recommendation':
      response = await handleEnhancedSystemRecommendation(message, entities, learningPatterns);
      break;

    case 'compatibility_check':
      response = await handleEnhancedCompatibilityCheck(message, entities, learningPatterns);
      break;

    case 'product_inquiry':
      response = await handleEnhancedProductInquiry(message, entities, learningPatterns);
      break;

    case 'pricing_request':
      response = await handleEnhancedPricingRequest(message, entities, learningPatterns);
      break;

    case 'technical_specs':
      response = await handleTechnicalSpecsRequest(message, entities, learningPatterns);
      break;

    case 'installation_inquiry':
      response = await handleInstallationInquiry(message, entities, learningPatterns);
      break;

    default:
      response = await handleGeneralEnhancedConversation(message, entities, learningPatterns);
  }

  // Apply learning enhancements to the response
  const enhancedResponse = await learningEngine.applyLearningToRecommendation(response, {
    industry: entities.industry || context.industry,
    userCount: entities.user_count || context.user_count,
    requestType: intent
  });

  return {
    ...enhancedResponse,
    intent: intent,
    entities: entities,
    confidence: calculateConfidence(intent, entities, learningPatterns),
    session_id: sessionId
  };
}

/**
 * Enhanced system recommendation with learning
 */
async function handleEnhancedSystemRecommendation(message, entities, learningPatterns) {
  const requirements = {
    industry: entities.industry || 'General',
    userCount: entities.user_count || 25,
    frequencyBand: entities.frequency_band || 'UHF',
    budget: entities.budget,
    specialRequirements: entities.special_requirements || []
  };

  try {
    // Get base recommendation from compatibility engine
    const baseRecommendation = await productCompatibility.recommendSystem(requirements);

    // Enhance with learning insights
    const enhancedRecommendation = await enhanceWithLearning(baseRecommendation, learningPatterns, requirements);

    let response = `Based on your requirements for a **${requirements.industry}** system with **${requirements.userCount} users**, here's my enhanced recommendation:\n\n`;

    // System architecture with learning insights
    response += `**Recommended System:** ${enhancedRecommendation.systemType}\n`;
    if (enhancedRecommendation.learning_applied && enhancedRecommendation.learning_applied.length > 0) {
      response += `*This recommendation is enhanced with insights from ${enhancedRecommendation.learning_applied.length} successful similar installations*\n\n`;
    }

    // Enhanced radio recommendations
    if (enhancedRecommendation.preferred_radios && enhancedRecommendation.preferred_radios.length > 0) {
      response += `**Preferred Radios** (based on successful ${requirements.industry} installations):\n`;
      enhancedRecommendation.preferred_radios.slice(0, 3).forEach((radio, index) => {
        response += `${index + 1}. ${radio}\n`;
      });
      response += '\n';
    }

    // Pricing with learning insights
    if (enhancedRecommendation.pricing) {
      response += `**System Pricing:**\n`;
      response += `• Equipment: $${enhancedRecommendation.pricing.repeaterCost + enhancedRecommendation.pricing.radioCost}\n`;
      response += `• Installation: $${enhancedRecommendation.pricing.installationCost}\n`;
      response += `• **Total: $${enhancedRecommendation.pricing.total}**\n`;
      response += `• **Per User: $${enhancedRecommendation.pricing.pricePerUser}**\n\n`;

      if (enhancedRecommendation.target_price_per_user) {
        const priceDiff = enhancedRecommendation.pricing.pricePerUser - enhancedRecommendation.target_price_per_user;
        if (Math.abs(priceDiff) > 50) {
          response += `*Note: This pricing is ${priceDiff > 0 ? 'above' : 'below'} the typical range for similar ${requirements.industry} installations*\n\n`;
        }
      }
    }

    // Learning-based insights
    if (enhancedRecommendation.industry_insight) {
      response += `**Industry Insights:** ${enhancedRecommendation.industry_insight}\n\n`;
    }

    // Enhanced recommendations
    const recommendations = enhancedRecommendation.recommendations || [];
    if (enhancedRecommendation.suggested_combinations) {
      recommendations.push(...enhancedRecommendation.suggested_combinations.map(combo =>
        `Consider ${combo.products.join(' + ')} combination (${Math.round(combo.success_rate * 100)}% success rate)`
      ));
    }

    if (recommendations.length > 0) {
      response += `**Recommendations:**\n`;
      recommendations.slice(0, 4).forEach(rec => {
        response += `• ${rec}\n`;
      });
    }

    return {
      message: response,
      suggestions: [
        'Show me alternative radio options',
        'What installation is included?',
        'Create a quote for this system',
        'Tell me about licensing requirements'
      ],
      products_discussed: extractProductsFromRecommendation(enhancedRecommendation),
      actions: [
        {
          type: 'system_recommendation',
          data: enhancedRecommendation
        }
      ]
    };

  } catch (error) {
    return {
      message: `I can help you design a system for your ${requirements.industry} environment. To provide the best recommendation, I need more details about your specific requirements.`,
      suggestions: [
        `Tell me about your facility layout`,
        `What's your budget range?`,
        `Any special requirements?`
      ]
    };
  }
}

/**
 * Enhanced compatibility checking with comprehensive database
 */
async function handleEnhancedCompatibilityCheck(message, entities, learningPatterns) {
  const radioModel = entities.radio_model;
  const accessoryType = entities.accessory_type;

  if (!radioModel) {
    return {
      message: "I can help you check compatibility! What radio model are you working with?",
      suggestions: ['R7 accessories', 'XPR3300e compatibility', 'Show all radio models']
    };
  }

  try {
    // Use enhanced compatibility checking
    const compatibility = await getEnhancedCompatibility(radioModel, accessoryType);

    if (!compatibility || compatibility.length === 0) {
      return {
        message: `I couldn't find specific compatibility data for ${radioModel}. Let me show you our most popular compatible accessories.`,
        suggestions: ['Show standard accessories', 'Check different radio model', 'Contact support']
      };
    }

    let response = `Here's comprehensive compatibility information for the **${radioModel}**:\n\n`;

    // Group by compatibility type
    const groupedCompatibility = groupCompatibilityByType(compatibility);

    Object.entries(groupedCompatibility).forEach(([type, items]) => {
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      response += `**${typeLabel} Compatible:**\n`;

      items.slice(0, 4).forEach(item => {
        const stockStatus = item.inventory_qty > 0 ? `✅ In stock (${item.inventory_qty})` : '❌ Out of stock';
        response += `• ${item.name} - $${item.price} ${stockStatus}\n`;
        if (item.installation_notes) {
          response += `  *${item.installation_notes}*\n`;
        }
      });
      response += '\n';
    });

    // Add learning insights
    if (learningPatterns.length > 0) {
      const accessoryPattern = learningPatterns.find(p => p.pattern_type === 'product_combination');
      if (accessoryPattern) {
        response += `**Popular Combinations:** Based on successful installations, customers often pair this radio with our professional accessory bundle.\n\n`;
      }
    }

    return {
      message: response,
      suggestions: [
        'Create quote with these accessories',
        'Show installation requirements',
        'Compare with other radio models'
      ],
      products_discussed: compatibility.map(item => item.sku),
      actions: [
        {
          type: 'compatibility_check',
          data: { radioModel, compatibility }
        }
      ]
    };

  } catch (error) {
    return {
      message: `I can help you find compatible accessories for ${radioModel}. Let me search our comprehensive database.`,
      suggestions: ['Show all accessories', 'Check system requirements', 'Contact technical support']
    };
  }
}

/**
 * Enhanced product inquiry with technical specifications
 */
async function handleEnhancedProductInquiry(message, entities, learningPatterns) {
  const productModel = entities.product_model || entities.radio_model;

  if (!productModel) {
    return {
      message: "What specific product would you like to know about? I have detailed specifications for our entire Motorola catalog.",
      suggestions: ['R7 specifications', 'XPR5350e details', 'Compare radio models']
    };
  }

  try {
    const productDetails = await getEnhancedProductDetails(productModel);

    if (!productDetails) {
      return {
        message: `I couldn't find ${productModel} in our catalog. Let me show you similar products.`,
        suggestions: ['Browse portable radios', 'Browse mobile radios', 'Search by features']
      };
    }

    let response = `**${productDetails.name}**\n\n`;

    // Technical specifications
    response += `**Technical Specifications:**\n`;
    response += `• Frequency: ${productDetails.frequency_range_min}-${productDetails.frequency_range_max} MHz (${productDetails.frequency_band})\n`;
    if (productDetails.power_output) response += `• Power Output: ${productDetails.power_output}W\n`;
    if (productDetails.battery_life) response += `• Battery Life: ${productDetails.battery_life} hours\n`;
    if (productDetails.ip_rating) response += `• IP Rating: ${productDetails.ip_rating}\n`;
    if (productDetails.weight) response += `• Weight: ${productDetails.weight}g\n`;
    response += '\n';

    // Features
    if (productDetails.features) {
      const features = JSON.parse(productDetails.features);
      response += `**Key Features:**\n`;
      features.slice(0, 5).forEach(feature => {
        response += `• ${feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
      });
      response += '\n';
    }

    // System compatibility
    if (productDetails.system_architectures) {
      const architectures = JSON.parse(productDetails.system_architectures);
      response += `**System Compatibility:** ${architectures.join(', ')}\n\n`;
    }

    // Pricing and availability
    response += `**Pricing & Availability:**\n`;
    response += `• Price: $${productDetails.price}\n`;
    response += `• Stock: ${productDetails.inventory_qty > 0 ? `✅ ${productDetails.inventory_qty} available` : '❌ Out of stock'}\n`;
    if (productDetails.labor_hours > 0) {
      response += `• Installation: ${productDetails.labor_hours} hours estimated\n`;
    }

    // Learning insights
    if (learningPatterns.length > 0) {
      const industryPattern = learningPatterns.find(p => p.pattern_type === 'industry_preference');
      if (industryPattern && industryPattern.pattern_data.preferred_radios.includes(productModel)) {
        response += `\n**Popular Choice:** This radio is frequently chosen for ${industryPattern.industry} installations.\n`;
      }
    }

    return {
      message: response,
      suggestions: [
        'Show compatible accessories',
        'Compare with similar models',
        'Add to quote',
        'Installation requirements'
      ],
      products_discussed: [productDetails.sku],
      actions: [
        {
          type: 'product_details',
          data: productDetails
        }
      ]
    };

  } catch (error) {
    return {
      message: `I can help you find detailed information about ${productModel}. Let me search our technical specifications database.`,
      suggestions: ['Browse product catalog', 'Search by category', 'Technical support']
    };
  }
}

/**
 * Enhanced pricing request with learning-based optimization
 */
async function handleEnhancedPricingRequest(message, entities, learningPatterns) {
  const quantity = entities.quantity || 1;
  const productModel = entities.product_model || entities.radio_model;
  const industry = entities.industry;
  const userCount = entities.user_count;

  if (!productModel && !userCount) {
    return {
      message: "I can provide detailed pricing! What products or system size are you looking to quote?",
      suggestions: ['Price for 25 radios', 'Complete system pricing', 'Bulk pricing options']
    };
  }

  try {
    let response = '';

    if (userCount) {
      // System pricing
      const systemPricing = await getSystemPricing(userCount, industry, learningPatterns);
      response = formatSystemPricingResponse(systemPricing, userCount, industry);
    } else {
      // Individual product pricing
      const productPricing = await getProductPricing(productModel, quantity, learningPatterns);
      response = formatProductPricingResponse(productPricing, quantity);
    }

    return {
      message: response,
      suggestions: [
        'Create formal quote',
        'Show financing options',
        'Compare alternatives',
        'Schedule consultation'
      ],
      actions: [
        {
          type: 'pricing_request',
          data: { productModel, quantity, userCount, industry }
        }
      ]
    };

  } catch (error) {
    return {
      message: "I can help you with pricing for any of our Motorola solutions. What specific products or system size are you interested in?",
      suggestions: ['System pricing calculator', 'Product price list', 'Volume discounts']
    };
  }
}

/**
 * Handle technical specifications requests
 */
async function handleTechnicalSpecsRequest(message, entities, learningPatterns) {
  const productModel = entities.product_model || entities.radio_model;

  try {
    const specs = await getTechnicalSpecifications(productModel);

    if (!specs) {
      return {
        message: "I can provide detailed technical specifications for any Motorola product. Which model are you interested in?",
        suggestions: ['R7 tech specs', 'XPR5350e specifications', 'Compare specifications']
      };
    }

    let response = `**${specs.name} - Technical Specifications**\n\n`;

    // RF Specifications
    response += `**RF Specifications:**\n`;
    response += `• Frequency Range: ${specs.frequency_range_min}-${specs.frequency_range_max} MHz\n`;
    response += `• Channel Spacing: 12.5/25 kHz\n`;
    if (specs.power_output) response += `• RF Power Output: ${specs.power_output}W\n`;
    response += `• Antenna Impedance: 50Ω\n\n`;

    // Power & Battery
    if (specs.battery_life) {
      response += `**Power & Battery:**\n`;
      response += `• Battery Life: ${specs.battery_life} hours (typical)\n`;
      response += `• Battery Type: Li-ion\n`;
      response += `• Operating Voltage: 7.4V\n\n`;
    }

    // Environmental
    response += `**Environmental:**\n`;
    response += `• Operating Temperature: ${specs.operating_temperature_min}°C to ${specs.operating_temperature_max}°C\n`;
    if (specs.ip_rating) response += `• IP Rating: ${specs.ip_rating}\n`;
    response += `• Humidity: 5% to 95% (non-condensing)\n\n`;

    // Physical
    if (specs.weight) {
      response += `**Physical Dimensions:**\n`;
      response += `• Weight: ${specs.weight}g\n`;
      if (specs.dimensions_height) response += `• Dimensions: ${specs.dimensions_length} x ${specs.dimensions_width} x ${specs.dimensions_height} mm\n`;
    }

    return {
      message: response,
      suggestions: [
        'Compare with other models',
        'Show compatibility chart',
        'Request datasheet',
        'Technical support'
      ],
      products_discussed: [specs.sku]
    };

  } catch (error) {
    return {
      message: "I can provide comprehensive technical specifications for our entire Motorola catalog. What product would you like to know about?",
      suggestions: ['Browse by category', 'Search specifications', 'Technical documentation']
    };
  }
}

/**
 * Handle installation inquiries
 */
async function handleInstallationInquiry(message, entities, learningPatterns) {
  const productModel = entities.product_model || entities.radio_model;
  const systemType = entities.system_type;
  const userCount = entities.user_count;

  try {
    const installationInfo = await getInstallationRequirements(productModel, systemType, userCount);

    let response = '';

    if (userCount) {
      response = `**Installation Requirements for ${userCount}-User System:**\n\n`;

      response += `**Estimated Timeline:**\n`;
      response += `• Site Survey: 1-2 days\n`;
      response += `• Equipment Installation: ${Math.ceil(userCount / 20)} days\n`;
      response += `• Testing & Commissioning: 1 day\n`;
      response += `• User Training: 0.5 days\n\n`;

      response += `**Installation Includes:**\n`;
      response += `• Repeater installation and configuration\n`;
      response += `• Antenna installation and optimization\n`;
      response += `• Radio programming and testing\n`;
      response += `• System documentation\n`;
      response += `• Basic user training\n\n`;

      const installationCost = calculateInstallationCost(userCount, systemType);
      response += `**Estimated Installation Cost: $${installationCost}**\n`;
      response += `*Includes labor, basic mounting hardware, and testing*\n`;

    } else if (productModel) {
      response = `**Installation Information for ${productModel}:**\n\n`;

      if (installationInfo.category === 'Portable') {
        response += `• **Programming Required:** Yes (included)\n`;
        response += `• **Time Required:** 30 minutes per radio\n`;
        response += `• **Complexity:** Low\n`;
        response += `• **Accessories Needed:** Programming cable\n`;
      } else if (installationInfo.category === 'Mobile') {
        response += `• **Installation Time:** 2-3 hours\n`;
        response += `• **Complexity:** Moderate\n`;
        response += `• **Requirements:** Vehicle mounting, antenna installation, power connection\n`;
        response += `• **Professional Installation:** Recommended\n`;
      } else if (installationInfo.category === 'Fixed') {
        response += `• **Installation Time:** 8+ hours\n`;
        response += `• **Complexity:** High\n`;
        response += `• **Requirements:** Site survey, antenna system, power, grounding\n`;
        response += `• **Professional Installation:** Required\n`;
      }
    }

    // Add learning insights about installation success
    if (learningPatterns.length > 0) {
      const installPattern = learningPatterns.find(p => p.pattern_type === 'configuration_success');
      if (installPattern) {
        response += `\n**Success Insights:** Based on ${installPattern.sample_size} similar installations, average completion time is within 10% of estimate.\n`;
      }
    }

    return {
      message: response,
      suggestions: [
        'Schedule site survey',
        'Get installation quote',
        'Training requirements',
        'Warranty information'
      ],
      actions: [
        {
          type: 'installation_inquiry',
          data: { productModel, systemType, userCount }
        }
      ]
    };

  } catch (error) {
    return {
      message: "I can provide detailed installation requirements for any Motorola system or product. What are you looking to install?",
      suggestions: ['Portable radio setup', 'Mobile installation', 'Repeater system installation']
    };
  }
}

/**
 * Enhanced general conversation with learning context
 */
async function handleGeneralEnhancedConversation(message, entities, learningPatterns) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    let response = "Hello! I'm your enhanced AI assistant for Motorola radio systems. I now have comprehensive product knowledge and learn from successful installations to give you better recommendations.";

    // Add personalized greeting based on learning
    if (learningPatterns.length > 0) {
      const industryPatterns = learningPatterns.filter(p => p.pattern_type === 'industry_preference');
      if (industryPatterns.length > 0) {
        response += ` I've recently helped with several ${industryPatterns[0].industry} installations and can share those insights with you.`;
      }
    }

    return {
      message: response,
      suggestions: [
        'Recommend a system for my facility',
        'Check product compatibility',
        'Show me your latest products',
        'Help with system design'
      ]
    };
  }

  if (lowerMessage.includes('help')) {
    return {
      message: "I can help you with comprehensive Motorola radio solutions! My enhanced capabilities include:\n\n• **Intelligent System Recommendations** - Based on your industry and requirements\n• **Complete Compatibility Checking** - All products and accessories\n• **Technical Specifications** - Detailed product information\n• **Installation Planning** - Requirements and timelines\n• **Learning-Based Insights** - From successful installations\n• **Pricing & Quoting** - Accurate cost estimates\n\nWhat would you like to explore?",
      suggestions: [
        'Design a system for my warehouse',
        'R7 vs XPR3300e comparison',
        'Complete healthcare solution',
        'Bulk pricing for 50 radios'
      ]
    };
  }

  return {
    message: "I'm here to help with all your Motorola radio needs! I have access to comprehensive product data, compatibility information, and insights from successful installations. What can I help you with today?",
    suggestions: [
      'System recommendation for my industry',
      'Product specifications and compatibility',
      'Installation and pricing information',
      'Compare different radio models'
    ]
  };
}

// Helper functions for enhanced processing

function classifyIntent(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('recommend') || lowerMessage.includes('system') || lowerMessage.includes('need for')) {
    return 'system_recommendation';
  }
  if (lowerMessage.includes('compatible') || lowerMessage.includes('work with') || lowerMessage.includes('accessories')) {
    return 'compatibility_check';
  }
  if (lowerMessage.includes('specs') || lowerMessage.includes('specification') || lowerMessage.includes('technical')) {
    return 'technical_specs';
  }
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('quote')) {
    return 'pricing_request';
  }
  if (lowerMessage.includes('install') || lowerMessage.includes('setup') || lowerMessage.includes('mount')) {
    return 'installation_inquiry';
  }
  if (lowerMessage.includes('tell me about') || lowerMessage.includes('what is') || lowerMessage.includes('show me')) {
    return 'product_inquiry';
  }

  return 'general';
}

function extractEntities(message) {
  const entities = {};

  // Extract radio models
  const radioModels = ['R7', 'XPR3300e', 'XPR3500e', 'XPR5350e', 'XPR5550e', 'XPR7550e', 'R2', 'CP100d', 'SL3500e'];
  for (const model of radioModels) {
    if (message.toLowerCase().includes(model.toLowerCase())) {
      entities.radio_model = model;
      entities.product_model = model;
      break;
    }
  }

  // Extract quantities
  const quantityMatch = message.match(/(\d+)\s*(?:radio|unit|piece)/i);
  if (quantityMatch) {
    entities.quantity = parseInt(quantityMatch[1]);
  }

  // Extract user count
  const userMatch = message.match(/(\d+)\s*(?:user|people|employee|person)/i);
  if (userMatch) {
    entities.user_count = parseInt(userMatch[1]);
  }

  // Extract industries
  const industries = ['education', 'healthcare', 'manufacturing', 'construction', 'warehousing', 'school', 'hospital', 'factory', 'warehouse'];
  for (const industry of industries) {
    if (message.toLowerCase().includes(industry)) {
      entities.industry = industry.charAt(0).toUpperCase() + industry.slice(1);
      break;
    }
  }

  // Extract frequency bands
  if (message.toLowerCase().includes('vhf')) entities.frequency_band = 'VHF';
  if (message.toLowerCase().includes('uhf')) entities.frequency_band = 'UHF';

  // Extract budget
  const budgetMatch = message.match(/\$?([\d,]+)\s*(?:budget|dollar)/i);
  if (budgetMatch) {
    entities.budget = parseInt(budgetMatch[1].replace(/,/g, ''));
  }

  return entities;
}

function calculateConfidence(intent, entities, learningPatterns) {
  let confidence = 0.7; // Base confidence

  // Increase confidence based on extracted entities
  if (entities.radio_model || entities.product_model) confidence += 0.1;
  if (entities.industry) confidence += 0.1;
  if (entities.user_count) confidence += 0.1;

  // Increase confidence based on available learning patterns
  if (learningPatterns.length > 0) {
    confidence += Math.min(0.2, learningPatterns.length * 0.05);
  }

  return Math.min(0.95, confidence);
}

// Database helper functions (placeholder implementations)
async function getEnhancedCompatibility(radioModel, accessoryType) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT DISTINCT pe.*, pc.compatibility_type, pc.installation_notes
      FROM parts_enhanced pe
      JOIN product_compatibility pc ON pe.id = pc.compatible_product_id
      JOIN parts_enhanced radio ON pc.primary_product_id = radio.id
      WHERE radio.model LIKE ?
      AND pe.category = 'Accessories'
    `;

    const params = [`%${radioModel}%`];

    if (accessoryType) {
      sql += ` AND pe.subcategory = ?`;
      params.push(accessoryType);
    }

    sql += ` ORDER BY pc.compatibility_type, pe.price`;

    db.all(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results || []);
    });
  });
}

async function getEnhancedProductDetails(productModel) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT * FROM parts_enhanced
      WHERE model LIKE ? OR name LIKE ?
      LIMIT 1
    `, [`%${productModel}%`, `%${productModel}%`], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function getTechnicalSpecifications(productModel) {
  return await getEnhancedProductDetails(productModel);
}

async function getInstallationRequirements(productModel, systemType, userCount) {
  // Implementation would query installation_requirements table
  return {
    category: productModel ? 'Portable' : 'System',
    complexity: userCount > 50 ? 'High' : 'Moderate'
  };
}

function groupCompatibilityByType(compatibility) {
  return compatibility.reduce((groups, item) => {
    const type = item.compatibility_type || 'optional';
    if (!groups[type]) groups[type] = [];
    groups[type].push(item);
    return groups;
  }, {});
}

function extractProductsFromRecommendation(recommendation) {
  const products = [];
  if (recommendation.radios && recommendation.radios.radios) {
    products.push(...recommendation.radios.radios.map(r => r.sku));
  }
  if (recommendation.repeaters && recommendation.repeaters.repeaters) {
    products.push(...recommendation.repeaters.repeaters.map(r => r.sku));
  }
  return products;
}

async function enhanceWithLearning(baseRecommendation, learningPatterns, requirements) {
  // Apply learning patterns to enhance the recommendation
  let enhanced = { ...baseRecommendation };

  // Apply industry preferences
  const industryPattern = learningPatterns.find(p => p.pattern_type === 'industry_preference');
  if (industryPattern && industryPattern.pattern_data.preferred_radios) {
    enhanced.preferred_radios = industryPattern.pattern_data.preferred_radios;
    enhanced.industry_insight = `Based on ${industryPattern.sample_size} successful ${requirements.industry} installations`;
  }

  return enhanced;
}

async function getSystemPricing(userCount, industry, learningPatterns) {
  // Implementation would calculate system pricing with learning insights
  const basePrice = userCount * 650; // Base estimate
  return {
    totalPrice: basePrice,
    pricePerUser: basePrice / userCount,
    insights: learningPatterns
  };
}

async function getProductPricing(productModel, quantity, learningPatterns) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT price, cost, name FROM parts_enhanced
      WHERE model LIKE ?
      LIMIT 1
    `, [`%${productModel}%`], (err, result) => {
      if (err) reject(err);
      else resolve(result ? {
        unitPrice: result.price,
        totalPrice: result.price * quantity,
        quantity: quantity,
        name: result.name
      } : null);
    });
  });
}

function formatSystemPricingResponse(pricing, userCount, industry) {
  return `**System Pricing for ${userCount} Users:**\n\n• Total Investment: $${pricing.totalPrice.toLocaleString()}\n• Per User Cost: $${pricing.pricePerUser.toFixed(0)}\n• Industry: ${industry || 'General'}\n\n*This pricing includes equipment, installation, and basic training*`;
}

function formatProductPricingResponse(pricing, quantity) {
  if (!pricing) return "I couldn't find pricing for that product. Let me help you with our current catalog.";

  return `**${pricing.name} Pricing:**\n\n• Unit Price: $${pricing.unitPrice}\n• Quantity: ${quantity}\n• Total: $${pricing.totalPrice.toLocaleString()}\n\n*Pricing includes equipment only. Installation and accessories quoted separately.*`;
}

function calculateInstallationCost(userCount, systemType) {
  const baseRate = 85; // Per hour
  const systemHours = Math.max(8, userCount * 0.5); // Minimum 8 hours
  return Math.round(systemHours * baseRate);
}

async function storeEnhancedInteraction(sessionId, userInput, response) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO ai_interactions_enhanced (
        session_id, user_input, ai_response, intent_classification,
        entities_extracted, confidence_score, response_type,
        products_mentioned, learning_applied, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    db.run(sql, [
      sessionId,
      userInput,
      response.message,
      response.intent || 'general',
      JSON.stringify(response.entities || {}),
      response.confidence || 0.8,
      response.intent || 'information',
      JSON.stringify(response.products_discussed || []),
      JSON.stringify(response.learning_applied || [])
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function storeQuoteOutcome(quoteId, outcome, feedback) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO quote_outcomes (
        quote_id, outcome, outcome_reason, customer_feedback,
        actual_installation_cost, actual_installation_time,
        performance_rating, issues_encountered, lessons_learned,
        competitor_product, competitor_price, follow_up_opportunities
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
      quoteId, outcome.outcome, outcome.reason, feedback,
      outcome.actual_installation_cost, outcome.actual_installation_time,
      outcome.performance_rating, JSON.stringify(outcome.issues || []),
      outcome.lessons_learned, outcome.competitor_product,
      outcome.competitor_price, outcome.follow_up_opportunities
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function getAIInsights(industry, userCount) {
  const learningPatterns = await learningEngine.getRelevantPatterns(industry, userCount, 'system_recommendation');

  return {
    industry: industry,
    userCount: userCount,
    recommendations: learningPatterns.map(pattern => ({
      type: pattern.pattern_type,
      insight: pattern.pattern_data,
      confidence: pattern.confidence_score,
      sample_size: pattern.sample_size
    })),
    generated_at: new Date().toISOString()
  };
}

module.exports = router;