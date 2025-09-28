const db = require('../database/db');

/**
 * Enhanced Product Compatibility Engine
 * Provides intelligent system design and comprehensive compatibility checking
 */
class EnhancedProductCompatibilityEngine {
  constructor() {
    this.systemArchitectureRules = {
      'Conventional': {
        max_users: 100,
        max_sites: 1,
        requires_repeater: true,
        min_channels: 1,
        licensing_complexity: 'simple',
        cost_multiplier: 1.0
      },
      'IP Site Connect': {
        max_users: 250,
        max_sites: 15,
        requires_repeater: true,
        min_channels: 2,
        licensing_complexity: 'moderate',
        cost_multiplier: 1.5,
        requires_ip_network: true
      },
      'Capacity Plus': {
        max_users: 500,
        max_sites: 1,
        requires_repeater: true,
        min_channels: 2,
        licensing_complexity: 'complex',
        cost_multiplier: 1.8,
        requires_trunking_license: true
      },
      'Capacity Max': {
        max_users: 3000,
        max_sites: 48,
        requires_repeater: true,
        min_channels: 4,
        licensing_complexity: 'enterprise',
        cost_multiplier: 3.0,
        requires_zone_controller: true,
        requires_management_system: true
      },
      'Linked Capacity Plus': {
        max_users: 1500,
        max_sites: 15,
        requires_repeater: true,
        min_channels: 2,
        licensing_complexity: 'complex',
        cost_multiplier: 2.5,
        requires_linking_equipment: true
      }
    };

    this.industryRequirements = {
      'Education': {
        required_features: ['emergency_button', 'quiet_operation', 'lockdown_capability'],
        preferred_radios: ['XPR3300e', 'XPR3500e', 'R2'],
        environmental_rating: 'standard',
        budget_sensitivity: 'high',
        installation_window: 'summer_preferred'
      },
      'Healthcare': {
        required_features: ['disinfectable_surfaces', 'quiet_alerts', 'emergency_button'],
        preferred_radios: ['XPR7550e', 'R7', 'SL3500e'],
        environmental_rating: 'medical_grade',
        budget_sensitivity: 'low',
        compliance_requirements: ['FDA', 'biocompatible']
      },
      'Manufacturing': {
        required_features: ['noise_canceling', 'rugged_construction', 'long_battery'],
        preferred_radios: ['R7', 'XPR3500e', 'XPR5350e'],
        environmental_rating: 'industrial',
        budget_sensitivity: 'moderate',
        hazardous_area_consideration: true
      },
      'Construction': {
        required_features: ['weather_resistant', 'rugged_construction', 'long_battery'],
        preferred_radios: ['R7', 'XPR7550e-IS'],
        environmental_rating: 'rugged',
        budget_sensitivity: 'moderate',
        multi_site_capability: true
      },
      'Warehousing': {
        required_features: ['vehicle_mounting', 'noise_canceling', 'long_range'],
        preferred_radios: ['R7', 'XPR3500e', 'XPR5350e'],
        environmental_rating: 'industrial',
        budget_sensitivity: 'moderate',
        coverage_type: 'large_facility'
      }
    };
  }

  /**
   * Enhanced system recommendation with comprehensive analysis
   */
  async recommendEnhancedSystem(requirements) {
    const {
      industry = 'General',
      userCount = 25,
      coverageType = 'building',
      frequencyBand = 'UHF',
      budget = null,
      specialRequirements = [],
      existingSystem = null,
      futureGrowth = 0
    } = requirements;

    try {
      console.log(`🎯 Generating enhanced system recommendation for ${industry} with ${userCount} users...`);

      // Analyze requirements and constraints
      const analysis = await this.analyzeRequirements(requirements);

      // Determine optimal system architecture
      const architecture = this.determineOptimalArchitecture(userCount + futureGrowth, analysis);

      // Get suitable equipment with enhanced compatibility checking
      const equipment = await this.selectOptimalEquipment(requirements, architecture, analysis);

      // Calculate comprehensive pricing with all factors
      const pricing = await this.calculateComprehensivePricing(equipment, architecture, requirements);

      // Generate implementation plan
      const implementation = this.generateImplementationPlan(equipment, architecture, requirements);

      // Generate risk assessment and mitigation strategies
      const riskAssessment = this.assessImplementationRisks(requirements, equipment, architecture);

      // Generate recommendations and insights
      const recommendations = this.generateEnhancedRecommendations(requirements, equipment, analysis);

      return {
        analysis,
        architecture,
        equipment,
        pricing,
        implementation,
        riskAssessment,
        recommendations,
        confidence_score: this.calculateRecommendationConfidence(analysis, equipment),
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Enhanced system recommendation error:', error);
      throw new Error(`Failed to generate system recommendation: ${error.message}`);
    }
  }

  /**
   * Analyze requirements and generate insights
   */
  async analyzeRequirements(requirements) {
    const industryProfile = await this.getIndustryProfile(requirements.industry);
    const environmentalFactors = this.analyzeEnvironmentalFactors(requirements);
    const scalabilityNeeds = this.analyzeScalabilityNeeds(requirements);
    const complianceRequirements = this.analyzeComplianceRequirements(requirements);

    return {
      industry_profile: industryProfile,
      environmental_factors: environmentalFactors,
      scalability_needs: scalabilityNeeds,
      compliance_requirements: complianceRequirements,
      critical_success_factors: this.identifyCriticalSuccessFactors(requirements, industryProfile)
    };
  }

  /**
   * Get detailed industry profile from database
   */
  async getIndustryProfile(industry) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM industry_profiles
        WHERE industry_name = ?
      `, [industry], (err, profile) => {
        if (err) return reject(err);

        if (profile) {
          // Parse JSON fields
          profile.coverage_requirements = JSON.parse(profile.coverage_requirements || '{}');
          profile.environmental_requirements = JSON.parse(profile.environmental_requirements || '{}');
          profile.regulatory_requirements = JSON.parse(profile.regulatory_requirements || '[]');
          profile.required_features = JSON.parse(profile.required_features || '[]');
          profile.preferred_features = JSON.parse(profile.preferred_features || '[]');
          profile.compliance_standards = JSON.parse(profile.compliance_standards || '[]');
          profile.typical_accessories = JSON.parse(profile.typical_accessories || '[]');
        }

        resolve(profile || this.getDefaultIndustryProfile());
      });
    });
  }

  /**
   * Determine optimal system architecture based on requirements
   */
  determineOptimalArchitecture(totalUsers, analysis) {
    const industryProfile = analysis.industry_profile;
    const scalabilityNeeds = analysis.scalability_needs;

    // Start with conventional for small systems
    let recommendedArchitecture = 'Conventional';

    // Consider user count thresholds
    if (totalUsers > 50 && totalUsers <= 500) {
      recommendedArchitecture = 'Capacity Plus';
    } else if (totalUsers > 500) {
      recommendedArchitecture = 'Capacity Max';
    }

    // Consider multi-site requirements
    if (scalabilityNeeds.multi_site_required) {
      if (totalUsers <= 250) {
        recommendedArchitecture = 'IP Site Connect';
      } else if (totalUsers <= 1500) {
        recommendedArchitecture = 'Linked Capacity Plus';
      } else {
        recommendedArchitecture = 'Capacity Max';
      }
    }

    // Get architecture details
    const architectureRules = this.systemArchitectureRules[recommendedArchitecture];

    return {
      name: recommendedArchitecture,
      rules: architectureRules,
      justification: this.generateArchitectureJustification(recommendedArchitecture, totalUsers, analysis),
      alternative_options: this.getAlternativeArchitectures(totalUsers, analysis),
      licensing_requirements: this.getLicensingRequirements(recommendedArchitecture, analysis),
      scalability_path: this.getScalabilityPath(recommendedArchitecture, scalabilityNeeds)
    };
  }

  /**
   * Select optimal equipment with enhanced compatibility
   */
  async selectOptimalEquipment(requirements, architecture, analysis) {
    const equipment = {
      repeaters: await this.selectOptimalRepeaters(requirements, architecture, analysis),
      radios: await this.selectOptimalRadios(requirements, architecture, analysis),
      accessories: await this.selectOptimalAccessories(requirements, architecture, analysis),
      infrastructure: await this.selectInfrastructureComponents(requirements, architecture, analysis)
    };

    // Validate complete system compatibility
    await this.validateSystemCompatibility(equipment);

    return equipment;
  }

  /**
   * Select optimal repeaters for the system
   */
  async selectOptimalRepeaters(requirements, architecture, analysis) {
    return new Promise((resolve, reject) => {
      // Get suitable repeater models for this architecture
      const architectureName = architecture.name;

      db.all(`
        SELECT pe.*, sa.name as architecture_name
        FROM parts_enhanced pe
        JOIN system_architectures sa ON JSON_EXTRACT(pe.system_architectures, '$') LIKE '%' || sa.name || '%'
        WHERE pe.category = 'Repeaters'
        AND pe.frequency_band = ?
        AND sa.name = ?
        AND pe.lifecycle_status = 'Current'
        ORDER BY pe.power_output DESC, pe.price ASC
      `, [requirements.frequencyBand, architectureName], (err, repeaters) => {
        if (err) return reject(err);

        if (!repeaters || repeaters.length === 0) {
          // Fallback to basic compatibility
          return this.getFallbackRepeaters(requirements.frequencyBand).then(resolve).catch(reject);
        }

        // Calculate how many repeaters needed
        const repeatersNeeded = this.calculateRepeatersNeeded(requirements, architecture, analysis);

        // Select optimal repeater model
        const optimal = this.selectOptimalRepeaterModel(repeaters, requirements, analysis);

        resolve({
          recommended_model: optimal,
          quantity: repeatersNeeded,
          alternatives: repeaters.slice(0, 3),
          justification: this.generateRepeaterJustification(optimal, requirements, analysis),
          installation_requirements: this.getRepeaterInstallationRequirements(optimal, requirements)
        });
      });
    });
  }

  /**
   * Select optimal radios for the system
   */
  async selectOptimalRadios(requirements, architecture, analysis) {
    return new Promise((resolve, reject) => {
      const industryProfile = analysis.industry_profile;
      const requiredFeatures = industryProfile.required_features || [];

      let sql = `
        SELECT pe.*,
               (CASE
                 WHEN JSON_EXTRACT(pe.features, '$') LIKE '%emergency_button%' THEN 1 ELSE 0
               END) as has_emergency,
               (CASE
                 WHEN JSON_EXTRACT(pe.features, '$') LIKE '%noise_canceling%' THEN 1 ELSE 0
               END) as has_noise_canceling,
               (CASE
                 WHEN JSON_EXTRACT(pe.features, '$') LIKE '%rugged%' THEN 1 ELSE 0
               END) as has_rugged
        FROM parts_enhanced pe
        WHERE pe.category IN ('Portable Radios', 'Mobile Radios')
        AND pe.frequency_band = ?
        AND pe.lifecycle_status = 'Current'
        AND pe.inventory_qty > 0
      `;

      const params = [requirements.frequencyBand];

      // Add industry-specific filtering
      if (industryProfile.preferred_radios && industryProfile.preferred_radios.length > 0) {
        const modelPlaceholders = industryProfile.preferred_radios.map(() => '?').join(',');
        sql += ` AND pe.model IN (${modelPlaceholders})`;
        params.push(...industryProfile.preferred_radios);
      }

      sql += ` ORDER BY (has_emergency + has_noise_canceling + has_rugged) DESC, pe.price ASC`;

      db.all(sql, params, (err, radios) => {
        if (err) return reject(err);

        // Categorize radios by features and price point
        const categorized = this.categorizeRadios(radios, requirements, analysis);

        // Select optimal radio for each category
        const recommendations = {
          primary_recommendation: categorized.optimal[0],
          budget_option: categorized.budget[0],
          premium_option: categorized.premium[0],
          mobile_options: categorized.mobile,
          quantity_breakdown: this.calculateRadioQuantities(requirements, categorized),
          feature_analysis: this.analyzeRadioFeatures(categorized, requiredFeatures),
          compatibility_notes: await this.getRadioCompatibilityNotes(categorized.optimal[0], requirements)
        };

        resolve(recommendations);
      });
    });
  }

  /**
   * Select optimal accessories with intelligent bundling
   */
  async selectOptimalAccessories(requirements, architecture, analysis) {
    const primaryRadio = architecture.equipment?.radios?.primary_recommendation;
    if (!primaryRadio) {
      return this.getDefaultAccessoryRecommendations(requirements);
    }

    return new Promise((resolve, reject) => {
      // Get compatible accessories for the primary radio
      db.all(`
        SELECT pe.*, pc.compatibility_type, pc.installation_notes
        FROM parts_enhanced pe
        JOIN product_compatibility pc ON pe.id = pc.compatible_product_id
        WHERE pc.primary_product_id = ?
        AND pe.category = 'Accessories'
        ORDER BY pc.compatibility_type, pe.subcategory, pe.price
      `, [primaryRadio.id], (err, accessories) => {
        if (err) return reject(err);

        // Group accessories by type and create intelligent bundles
        const grouped = this.groupAccessoriesByType(accessories);
        const bundles = this.createAccessoryBundles(grouped, requirements, analysis);

        resolve({
          essential_accessories: bundles.essential,
          recommended_accessories: bundles.recommended,
          optional_accessories: bundles.optional,
          bundled_pricing: this.calculateBundlePricing(bundles, requirements.userCount),
          compatibility_matrix: grouped,
          installation_considerations: this.getAccessoryInstallationConsiderations(bundles)
        });
      });
    });
  }

  /**
   * Select infrastructure components (antennas, cables, power, etc.)
   */
  async selectInfrastructureComponents(requirements, architecture, analysis) {
    const components = {
      antennas: await this.selectAntennaSystem(requirements, architecture, analysis),
      power_systems: this.selectPowerSystems(requirements, architecture, analysis),
      networking: this.selectNetworkingComponents(requirements, architecture, analysis),
      mounting_hardware: this.selectMountingHardware(requirements, architecture, analysis),
      testing_equipment: this.selectTestingEquipment(requirements, architecture, analysis)
    };

    return {
      ...components,
      installation_sequence: this.generateInstallationSequence(components),
      total_infrastructure_cost: this.calculateInfrastructureCost(components)
    };
  }

  /**
   * Calculate comprehensive pricing with all factors
   */
  async calculateComprehensivePricing(equipment, architecture, requirements) {
    const costBreakdown = {
      equipment_costs: this.calculateEquipmentCosts(equipment),
      installation_costs: this.calculateInstallationCosts(equipment, architecture, requirements),
      licensing_costs: this.calculateLicensingCosts(architecture, requirements),
      project_management_costs: this.calculateProjectManagementCosts(requirements),
      training_costs: this.calculateTrainingCosts(requirements),
      ongoing_costs: this.calculateOngoingCosts(equipment, requirements)
    };

    const financialAnalysis = {
      total_initial_investment: Object.values(costBreakdown).reduce((sum, cost) => sum + (cost.total || cost), 0),
      cost_per_user: 0,
      roi_analysis: this.calculateROI(costBreakdown, requirements),
      financing_options: this.getFinancingOptions(costBreakdown.total_initial_investment),
      cost_comparison: await this.getIndustryBenchmarking(requirements, costBreakdown)
    };

    financialAnalysis.cost_per_user = financialAnalysis.total_initial_investment / requirements.userCount;

    return {
      cost_breakdown: costBreakdown,
      financial_analysis: financialAnalysis,
      payment_schedule: this.generatePaymentSchedule(costBreakdown),
      cost_optimization_options: this.identifyCostOptimizations(equipment, costBreakdown)
    };
  }

  /**
   * Generate comprehensive implementation plan
   */
  generateImplementationPlan(equipment, architecture, requirements) {
    const phases = [
      {
        name: 'Site Survey & Planning',
        duration_days: this.calculateSiteSurveyDuration(requirements),
        activities: this.getSiteSurveyActivities(requirements),
        deliverables: ['Site survey report', 'RF engineering plan', 'Installation timeline'],
        critical_path: true
      },
      {
        name: 'Licensing & Regulatory',
        duration_days: this.calculateLicensingDuration(architecture, requirements),
        activities: this.getLicensingActivities(architecture, requirements),
        deliverables: ['FCC license application', 'Frequency coordination', 'Regulatory approvals'],
        critical_path: true
      },
      {
        name: 'Equipment Procurement',
        duration_days: this.calculateProcurementDuration(equipment),
        activities: ['Order equipment', 'Inspect and test', 'Prepare for installation'],
        deliverables: ['Equipment delivery', 'Pre-installation testing', 'Staging preparation'],
        critical_path: false
      },
      {
        name: 'Infrastructure Installation',
        duration_days: this.calculateInfrastructureInstallationDuration(equipment, requirements),
        activities: this.getInfrastructureActivities(equipment, requirements),
        deliverables: ['Antenna systems', 'Power infrastructure', 'Network connectivity'],
        critical_path: true
      },
      {
        name: 'System Installation & Configuration',
        duration_days: this.calculateSystemInstallationDuration(equipment, requirements),
        activities: this.getSystemInstallationActivities(equipment),
        deliverables: ['Repeater installation', 'System programming', 'Initial testing'],
        critical_path: true
      },
      {
        name: 'Testing & Commissioning',
        duration_days: this.calculateTestingDuration(equipment, requirements),
        activities: this.getTestingActivities(equipment, requirements),
        deliverables: ['Coverage testing', 'Performance validation', 'System documentation'],
        critical_path: true
      },
      {
        name: 'Training & Deployment',
        duration_days: this.calculateTrainingDuration(requirements),
        activities: this.getTrainingActivities(requirements),
        deliverables: ['User training', 'Administrator training', 'System handover'],
        critical_path: false
      }
    ];

    return {
      phases: phases,
      total_duration: this.calculateTotalProjectDuration(phases),
      critical_path_duration: this.calculateCriticalPathDuration(phases),
      resource_requirements: this.calculateResourceRequirements(phases, requirements),
      timeline_visualization: this.generateTimelineVisualization(phases),
      risk_mitigation_activities: this.getRiskMitigationActivities(equipment, architecture, requirements)
    };
  }

  /**
   * Assess implementation risks and mitigation strategies
   */
  assessImplementationRisks(requirements, equipment, architecture) {
    const risks = [
      {
        category: 'Technical',
        risks: this.identifyTechnicalRisks(requirements, equipment, architecture),
        mitigation_strategies: this.getTechnicalMitigationStrategies()
      },
      {
        category: 'Schedule',
        risks: this.identifyScheduleRisks(requirements, equipment),
        mitigation_strategies: this.getScheduleMitigationStrategies()
      },
      {
        category: 'Cost',
        risks: this.identifyCostRisks(requirements, equipment),
        mitigation_strategies: this.getCostMitigationStrategies()
      },
      {
        category: 'Operational',
        risks: this.identifyOperationalRisks(requirements, architecture),
        mitigation_strategies: this.getOperationalMitigationStrategies()
      }
    ];

    return {
      risk_categories: risks,
      overall_risk_score: this.calculateOverallRiskScore(risks),
      top_risks: this.identifyTopRisks(risks),
      contingency_plans: this.generateContingencyPlans(risks, requirements)
    };
  }

  /**
   * Generate enhanced recommendations and insights
   */
  generateEnhancedRecommendations(requirements, equipment, analysis) {
    const recommendations = [];

    // Industry-specific recommendations
    recommendations.push(...this.getIndustrySpecificRecommendations(requirements, analysis));

    // Technical recommendations
    recommendations.push(...this.getTechnicalRecommendations(equipment, requirements));

    // Operational recommendations
    recommendations.push(...this.getOperationalRecommendations(requirements, analysis));

    // Future planning recommendations
    recommendations.push(...this.getFuturePlanningRecommendations(requirements, equipment));

    return {
      immediate_actions: recommendations.filter(r => r.priority === 'immediate'),
      short_term_recommendations: recommendations.filter(r => r.priority === 'short_term'),
      long_term_considerations: recommendations.filter(r => r.priority === 'long_term'),
      best_practices: this.getBestPractices(requirements, analysis),
      success_factors: this.getSuccessFactors(requirements, equipment, analysis)
    };
  }

  /**
   * Calculate recommendation confidence score
   */
  calculateRecommendationConfidence(analysis, equipment) {
    let confidence = 0.7; // Base confidence

    // Increase confidence based on data quality
    if (analysis.industry_profile && analysis.industry_profile.id) confidence += 0.1;
    if (equipment.radios && equipment.radios.primary_recommendation) confidence += 0.1;
    if (equipment.repeaters && equipment.repeaters.recommended_model) confidence += 0.1;

    // Increase confidence based on requirement clarity
    if (analysis.critical_success_factors && analysis.critical_success_factors.length > 0) confidence += 0.05;
    if (analysis.compliance_requirements && analysis.compliance_requirements.length > 0) confidence += 0.05;

    return Math.min(0.95, confidence);
  }

  // Helper method implementations (simplified for brevity)
  getDefaultIndustryProfile() {
    return {
      industry_name: 'General',
      required_features: ['emergency_button'],
      preferred_features: ['programmable_buttons'],
      budget_range_min: 15000,
      budget_range_max: 50000
    };
  }

  analyzeEnvironmentalFactors(requirements) {
    return {
      temperature_range: 'standard',
      humidity_levels: 'normal',
      dust_protection_needed: false,
      chemical_resistance_needed: false,
      vibration_resistance_needed: false
    };
  }

  analyzeScalabilityNeeds(requirements) {
    return {
      expected_growth: requirements.futureGrowth || 0,
      multi_site_required: false,
      integration_requirements: [],
      future_technology_considerations: []
    };
  }

  analyzeComplianceRequirements(requirements) {
    return {
      regulatory_standards: ['FCC Part 90'],
      industry_certifications: [],
      safety_requirements: [],
      environmental_compliance: []
    };
  }

  identifyCriticalSuccessFactors(requirements, industryProfile) {
    const factors = ['reliable_coverage', 'easy_operation', 'cost_effectiveness'];

    if (industryProfile.required_features) {
      factors.push(...industryProfile.required_features.map(feature => `feature_${feature}`));
    }

    return factors;
  }

  // Additional helper methods would be implemented here...
  // For brevity, showing structure of key methods

  generateArchitectureJustification(architecture, userCount, analysis) {
    return `${architecture} selected for ${userCount} users based on scalability requirements and industry best practices.`;
  }

  getAlternativeArchitectures(userCount, analysis) {
    return []; // Implementation would return alternative architecture options
  }

  getLicensingRequirements(architecture, analysis) {
    return {
      fcc_license_required: true,
      license_type: 'Business',
      estimated_cost: 800,
      processing_time_days: 45
    };
  }

  // Continue with additional helper method implementations...
}

module.exports = new EnhancedProductCompatibilityEngine();