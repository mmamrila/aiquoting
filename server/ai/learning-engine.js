const db = require('../database/db');

/**
 * AI Learning Engine
 * Learns from successful quotes and user interactions to improve recommendations
 */
class LearningEngine {
  constructor() {
    this.learningPatterns = {
      product_combinations: new Map(),
      industry_preferences: new Map(),
      price_sensitivity: new Map(),
      configuration_success: new Map(),
      user_feedback: new Map()
    };

    this.confidenceThreshold = 0.6; // Minimum confidence to apply learning
    this.minimumSampleSize = 3; // Minimum samples needed for a pattern
  }

  /**
   * Learn from a successful quote
   */
  async learnFromSuccessfulQuote(quoteId, outcome) {
    console.log(`🧠 Learning from ${outcome.outcome} quote #${quoteId}...`);

    try {
      // Get quote details with all line items
      const quoteData = await this.getQuoteDetails(quoteId);
      if (!quoteData) {
        console.warn(`⚠️ Could not find quote ${quoteId} for learning`);
        return;
      }

      // Extract learning patterns
      await this.extractProductCombinationPatterns(quoteData, outcome);
      await this.extractIndustryPreferences(quoteData, outcome);
      await this.extractPriceSensitivityPatterns(quoteData, outcome);
      await this.extractConfigurationSuccessPatterns(quoteData, outcome);

      // Store learning patterns in database
      await this.storeLearningPatterns();

      console.log(`✅ Learning completed for quote #${quoteId}`);

    } catch (error) {
      console.error('❌ Error learning from quote:', error.message);
    }
  }

  /**
   * Get detailed quote information
   */
  async getQuoteDetails(quoteId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          q.*,
          c.industry,
          c.user_count,
          c.coverage_area,
          c.current_system,
          c.special_requirements
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.id = ?
      `;

      db.get(sql, [quoteId], (err, quote) => {
        if (err) return reject(err);
        if (!quote) return resolve(null);

        // Get quote items
        db.all(`
          SELECT
            qi.*,
            p.category,
            p.subcategory,
            p.model,
            p.frequency_band,
            p.system_type
          FROM quote_items qi
          JOIN parts p ON qi.part_id = p.id
          WHERE qi.quote_id = ?
        `, [quoteId], (err, items) => {
          if (err) return reject(err);

          quote.items = items || [];
          resolve(quote);
        });
      });
    });
  }

  /**
   * Extract product combination patterns that lead to successful quotes
   */
  async extractProductCombinationPatterns(quoteData, outcome) {
    if (outcome.outcome !== 'won') return;

    const combinations = this.generateProductCombinations(quoteData.items);

    for (const combination of combinations) {
      const key = combination.join('|');
      const existing = this.learningPatterns.product_combinations.get(key) || {
        products: combination,
        success_count: 0,
        total_count: 0,
        industries: new Set(),
        user_counts: [],
        avg_price_per_user: 0
      };

      existing.success_count++;
      existing.total_count++;
      existing.industries.add(quoteData.industry);
      existing.user_counts.push(quoteData.user_count);

      if (quoteData.user_count > 0) {
        existing.avg_price_per_user = (existing.avg_price_per_user + (quoteData.total_amount / quoteData.user_count)) / 2;
      }

      this.learningPatterns.product_combinations.set(key, existing);
    }
  }

  /**
   * Generate meaningful product combinations from quote items
   */
  generateProductCombinations(items) {
    const combinations = [];

    // Primary radio + accessories combinations
    const radios = items.filter(item => item.category === 'Portable Radios' || item.category === 'Mobile Radios');
    const accessories = items.filter(item => item.category === 'Accessories');
    const repeaters = items.filter(item => item.category === 'Repeaters');

    // Radio + Repeater combinations (system architecture)
    radios.forEach(radio => {
      repeaters.forEach(repeater => {
        combinations.push([radio.model, repeater.model]);
      });
    });

    // Radio + Accessory combinations
    radios.forEach(radio => {
      accessories.forEach(accessory => {
        combinations.push([radio.model, accessory.subcategory]);
      });
    });

    // Frequency band + system type combinations
    const uniqueFreqBands = [...new Set(items.map(item => item.frequency_band).filter(Boolean))];
    const uniqueSystemTypes = [...new Set(items.map(item => item.system_type).filter(Boolean))];

    uniqueFreqBands.forEach(freq => {
      uniqueSystemTypes.forEach(system => {
        combinations.push([freq, system]);
      });
    });

    return combinations;
  }

  /**
   * Extract industry-specific preferences
   */
  async extractIndustryPreferences(quoteData, outcome) {
    if (!quoteData.industry || outcome.outcome !== 'won') return;

    const industry = quoteData.industry;
    const existing = this.learningPatterns.industry_preferences.get(industry) || {
      industry: industry,
      preferred_radios: new Map(),
      preferred_accessories: new Map(),
      typical_user_ranges: [],
      avg_price_per_user: 0,
      success_rate: 0,
      total_quotes: 0,
      won_quotes: 0
    };

    // Track preferred products
    quoteData.items.forEach(item => {
      if (item.category === 'Portable Radios' || item.category === 'Mobile Radios') {
        const radioCount = existing.preferred_radios.get(item.model) || 0;
        existing.preferred_radios.set(item.model, radioCount + 1);
      }

      if (item.category === 'Accessories') {
        const accessoryCount = existing.preferred_accessories.get(item.subcategory) || 0;
        existing.preferred_accessories.set(item.subcategory, accessoryCount + 1);
      }
    });

    existing.typical_user_ranges.push(quoteData.user_count);
    existing.total_quotes++;

    if (outcome.outcome === 'won') {
      existing.won_quotes++;
      if (quoteData.user_count > 0) {
        existing.avg_price_per_user = (existing.avg_price_per_user + (quoteData.total_amount / quoteData.user_count)) / 2;
      }
    }

    existing.success_rate = existing.won_quotes / existing.total_quotes;

    this.learningPatterns.industry_preferences.set(industry, existing);
  }

  /**
   * Extract price sensitivity patterns
   */
  async extractPriceSensitivityPatterns(quoteData, outcome) {
    if (!quoteData.user_count || quoteData.user_count === 0) return;

    const pricePerUser = quoteData.total_amount / quoteData.user_count;
    const userRange = this.getUserCountRange(quoteData.user_count);
    const key = `${quoteData.industry || 'Unknown'}_${userRange}`;

    const existing = this.learningPatterns.price_sensitivity.get(key) || {
      industry: quoteData.industry,
      user_range: userRange,
      price_points: [],
      outcomes: [],
      win_rates_by_price: new Map()
    };

    existing.price_points.push(pricePerUser);
    existing.outcomes.push({
      price_per_user: pricePerUser,
      outcome: outcome.outcome,
      performance_rating: outcome.performance_rating || 0
    });

    // Calculate win rates by price range
    const priceRange = this.getPriceRange(pricePerUser);
    const priceStats = existing.win_rates_by_price.get(priceRange) || { wins: 0, total: 0 };
    priceStats.total++;
    if (outcome.outcome === 'won') priceStats.wins++;
    existing.win_rates_by_price.set(priceRange, priceStats);

    this.learningPatterns.price_sensitivity.set(key, existing);
  }

  /**
   * Extract configuration and installation success patterns
   */
  async extractConfigurationSuccessPatterns(quoteData, outcome) {
    if (outcome.outcome !== 'won' || !outcome.actual_installation_time) return;

    // Learn about installation time accuracy
    const estimatedTime = quoteData.items.reduce((total, item) => total + (item.labor_hours * item.quantity), 0);
    const actualTime = outcome.actual_installation_time;
    const accuracy = 1 - Math.abs(estimatedTime - actualTime) / estimatedTime;

    const key = `${quoteData.system_type || 'Unknown'}_installation`;
    const existing = this.learningPatterns.configuration_success.get(key) || {
      system_type: quoteData.system_type,
      time_estimates: [],
      actual_times: [],
      accuracy_scores: [],
      common_issues: new Map(),
      performance_ratings: []
    };

    existing.time_estimates.push(estimatedTime);
    existing.actual_times.push(actualTime);
    existing.accuracy_scores.push(accuracy);
    existing.performance_ratings.push(outcome.performance_rating || 0);

    // Track common issues
    if (outcome.issues_encountered) {
      try {
        const issues = JSON.parse(outcome.issues_encountered);
        issues.forEach(issue => {
          const count = existing.common_issues.get(issue) || 0;
          existing.common_issues.set(issue, count + 1);
        });
      } catch (e) {
        // Handle non-JSON issues
        const count = existing.common_issues.get(outcome.issues_encountered) || 0;
        existing.common_issues.set(outcome.issues_encountered, count + 1);
      }
    }

    this.learningPatterns.configuration_success.set(key, existing);
  }

  /**
   * Store learning patterns in database
   */
  async storeLearningPatterns() {
    // Store product combination patterns
    for (const [key, pattern] of this.learningPatterns.product_combinations) {
      if (pattern.total_count >= this.minimumSampleSize) {
        const confidence = pattern.success_count / pattern.total_count;

        await this.storeLearningPattern('product_combination', {
          combination: pattern.products,
          success_rate: confidence,
          industries: Array.from(pattern.industries),
          avg_user_count: pattern.user_counts.reduce((a, b) => a + b, 0) / pattern.user_counts.length,
          avg_price_per_user: pattern.avg_price_per_user
        }, confidence, pattern.total_count);
      }
    }

    // Store industry preferences
    for (const [industry, pattern] of this.learningPatterns.industry_preferences) {
      if (pattern.total_quotes >= this.minimumSampleSize) {
        const topRadios = Array.from(pattern.preferred_radios.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([radio]) => radio);

        const topAccessories = Array.from(pattern.preferred_accessories.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([accessory]) => accessory);

        await this.storeLearningPattern('industry_preference', {
          industry: industry,
          preferred_radios: topRadios,
          preferred_accessories: topAccessories,
          typical_user_range: this.calculateUserRange(pattern.typical_user_ranges),
          avg_price_per_user: pattern.avg_price_per_user
        }, pattern.success_rate, pattern.total_quotes, industry);
      }
    }

    // Store price sensitivity patterns
    for (const [key, pattern] of this.learningPatterns.price_sensitivity) {
      if (pattern.outcomes.length >= this.minimumSampleSize) {
        const winRates = Array.from(pattern.win_rates_by_price.entries()).map(([range, stats]) => ({
          price_range: range,
          win_rate: stats.wins / stats.total,
          sample_size: stats.total
        }));

        await this.storeLearningPattern('price_sensitivity', {
          industry: pattern.industry,
          user_range: pattern.user_range,
          win_rates_by_price: winRates,
          optimal_price_range: this.findOptimalPriceRange(winRates)
        }, this.calculateOverallWinRate(pattern.outcomes), pattern.outcomes.length, pattern.industry);
      }
    }
  }

  /**
   * Store a single learning pattern in the database
   */
  async storeLearningPattern(patternType, patternData, confidenceScore, sampleSize, industry = null, userCountRange = null) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO ai_learning_patterns
        (pattern_type, pattern_data, confidence_score, success_rate, sample_size,
         industry, user_count_range, last_validated, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
      `;

      db.run(sql, [
        patternType,
        JSON.stringify(patternData),
        confidenceScore,
        patternData.success_rate || confidenceScore,
        sampleSize,
        industry,
        userCountRange
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get relevant learning patterns for a quote scenario
   */
  async getRelevantPatterns(industry, userCount, requestType) {
    return new Promise((resolve, reject) => {
      const userRange = this.getUserCountRange(userCount);

      const sql = `
        SELECT * FROM ai_learning_patterns
        WHERE confidence_score >= ?
        AND sample_size >= ?
        AND (industry IS NULL OR industry = ?)
        AND (user_count_range IS NULL OR user_count_range = ?)
        ORDER BY confidence_score DESC, sample_size DESC
        LIMIT 10
      `;

      db.all(sql, [this.confidenceThreshold, this.minimumSampleSize, industry, userRange], (err, patterns) => {
        if (err) return reject(err);

        const parsedPatterns = patterns.map(pattern => ({
          ...pattern,
          pattern_data: JSON.parse(pattern.pattern_data)
        }));

        resolve(parsedPatterns);
      });
    });
  }

  /**
   * Apply learning patterns to improve recommendations
   */
  async applyLearningToRecommendation(baseRecommendation, context) {
    const { industry, userCount, requestType } = context;
    const relevantPatterns = await this.getRelevantPatterns(industry, userCount, requestType);

    let enhancedRecommendation = { ...baseRecommendation };

    for (const pattern of relevantPatterns) {
      switch (pattern.pattern_type) {
        case 'product_combination':
          enhancedRecommendation = this.applyProductCombinationLearning(enhancedRecommendation, pattern);
          break;

        case 'industry_preference':
          enhancedRecommendation = this.applyIndustryPreferenceLearning(enhancedRecommendation, pattern);
          break;

        case 'price_sensitivity':
          enhancedRecommendation = this.applyPriceSensitivityLearning(enhancedRecommendation, pattern);
          break;
      }
    }

    // Add learning context to recommendation
    enhancedRecommendation.learning_applied = relevantPatterns.map(p => ({
      type: p.pattern_type,
      confidence: p.confidence_score,
      sample_size: p.sample_size
    }));

    return enhancedRecommendation;
  }

  /**
   * Apply product combination learning
   */
  applyProductCombinationLearning(recommendation, pattern) {
    const data = pattern.pattern_data;

    // Prioritize successful combinations
    if (data.combination && data.success_rate > 0.7) {
      recommendation.suggested_combinations = recommendation.suggested_combinations || [];
      recommendation.suggested_combinations.push({
        products: data.combination,
        success_rate: data.success_rate,
        reason: 'proven_combination'
      });
    }

    return recommendation;
  }

  /**
   * Apply industry preference learning
   */
  applyIndustryPreferenceLearning(recommendation, pattern) {
    const data = pattern.pattern_data;

    if (data.preferred_radios && data.preferred_radios.length > 0) {
      recommendation.preferred_radios = data.preferred_radios;
      recommendation.industry_insight = `Based on ${pattern.sample_size} successful ${data.industry} installations`;
    }

    if (data.preferred_accessories && data.preferred_accessories.length > 0) {
      recommendation.recommended_accessories = data.preferred_accessories;
    }

    if (data.avg_price_per_user) {
      recommendation.target_price_per_user = data.avg_price_per_user;
    }

    return recommendation;
  }

  /**
   * Apply price sensitivity learning
   */
  applyPriceSensitivityLearning(recommendation, pattern) {
    const data = pattern.pattern_data;

    if (data.optimal_price_range) {
      recommendation.optimal_price_range = data.optimal_price_range;
      recommendation.pricing_insight = `Optimal pricing based on ${pattern.sample_size} similar quotes`;
    }

    return recommendation;
  }

  /**
   * Record user feedback for learning
   */
  async recordUserFeedback(sessionId, feedback) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE ai_interactions_enhanced
        SET user_satisfaction = ?, follow_up_required = ?
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `;

      db.run(sql, [feedback.satisfaction, feedback.follow_up_required || false, sessionId], (err) => {
        if (err) return reject(err);

        // Learn from the feedback
        this.learnFromFeedback(sessionId, feedback);
        resolve();
      });
    });
  }

  /**
   * Learn from user feedback patterns
   */
  async learnFromFeedback(sessionId, feedback) {
    // Get the interaction context
    const interaction = await this.getInteractionContext(sessionId);
    if (!interaction) return;

    const key = `${interaction.intent_classification}_feedback`;
    const existing = this.learningPatterns.user_feedback.get(key) || {
      intent: interaction.intent_classification,
      feedback_scores: [],
      avg_satisfaction: 0,
      improvement_areas: new Map()
    };

    existing.feedback_scores.push(feedback.satisfaction);
    existing.avg_satisfaction = existing.feedback_scores.reduce((a, b) => a + b, 0) / existing.feedback_scores.length;

    if (feedback.satisfaction < 3 && feedback.improvement_area) {
      const count = existing.improvement_areas.get(feedback.improvement_area) || 0;
      existing.improvement_areas.set(feedback.improvement_area, count + 1);
    }

    this.learningPatterns.user_feedback.set(key, existing);
  }

  /**
   * Get interaction context for learning
   */
  async getInteractionContext(sessionId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM ai_interactions_enhanced
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [sessionId], (err, interaction) => {
        if (err) reject(err);
        else resolve(interaction);
      });
    });
  }

  // Helper functions
  getUserCountRange(userCount) {
    if (userCount <= 25) return '1-25';
    if (userCount <= 50) return '26-50';
    if (userCount <= 100) return '51-100';
    if (userCount <= 200) return '101-200';
    return '200+';
  }

  getPriceRange(pricePerUser) {
    if (pricePerUser < 500) return 'budget';
    if (pricePerUser < 800) return 'mid_range';
    if (pricePerUser < 1200) return 'premium';
    return 'enterprise';
  }

  calculateUserRange(userCounts) {
    const min = Math.min(...userCounts);
    const max = Math.max(...userCounts);
    const avg = userCounts.reduce((a, b) => a + b, 0) / userCounts.length;
    return { min, max, avg };
  }

  findOptimalPriceRange(winRates) {
    return winRates.reduce((best, current) =>
      current.win_rate > best.win_rate ? current : best
    ).price_range;
  }

  calculateOverallWinRate(outcomes) {
    const wins = outcomes.filter(o => o.outcome === 'won').length;
    return wins / outcomes.length;
  }
}

module.exports = LearningEngine;