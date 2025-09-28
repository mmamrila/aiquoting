const db = require('./db');

/**
 * Intelligent Compatibility Matrix Builder
 * Builds comprehensive product compatibility relationships based on technical specifications
 */
class CompatibilityBuilder {
  constructor() {
    this.compatibilityRules = {
      // Battery compatibility rules
      battery: {
        'MOTOTRBO R7 series': ['PMNN4807', 'PMNN4468'],
        'MOTOTRBO XPR3000e series': ['PMNN4468', 'PMNN4476A', 'PMNN4544A'],
        'MOTOTRBO R2 series': ['PMNN4598', 'PMNN4476A'],
        'MOTOTRBO SL series': ['PMNN4095'],
        'MOTOTRBO XPR7000e series': ['PMNN4477', 'PMNN4544A']
      },

      // Charger compatibility
      charger: {
        'Standard': ['PMPN4137A', 'PMLN6598A'], // Works with most MOTOTRBO
        'Budget': ['PMPN4173A'], // Works with R2, CP100d
        'Multi-Unit': ['PMLN6589A', 'PMLN7190'] // Gang chargers
      },

      // Antenna compatibility by connector type and frequency
      antenna: {
        'SMA_VHF': ['PMAE4003A', 'PMAD4170'],
        'SMA_UHF': ['PMAE4003A', 'PMAD4170', 'PMAE4016'],
        'TNC_VHF': ['PMAE4095'],
        'TNC_UHF': ['PMAE4095', 'PMAD4145']
      },

      // Audio accessory compatibility
      audio: {
        'Standard_RSM': ['PMMN4029', 'PMMN4073'], // Basic remote speaker mics
        'Advanced_RSM': ['PMMN4125', 'RLN6562'], // Advanced features
        'Bluetooth': ['RLN6554A'], // Bluetooth accessories
        'Surveillance': ['RLN6555'] // Covert accessories
      },

      // System architecture compatibility
      architecture: {
        'Conventional': ['SLR1000', 'SLR5700', 'SLR8000', 'XPR8300', 'XPR8400'],
        'IP Site Connect': ['SLR5700', 'SLR8000'],
        'Capacity Plus': ['SLR5700', 'SLR8000'],
        'Capacity Max': ['SLR8000'],
        'Linked Capacity Plus': ['SLR8000']
      },

      // Frequency band compatibility
      frequency: {
        'VHF': ['136-174'],
        'UHF': ['403-470'],
        '700MHz': ['700-800'],
        '800MHz': ['806-869'],
        '900MHz': ['896-941']
      }
    };

    // Installation complexity matrix
    this.installationComplexity = {
      'Portable': {
        'programming_only': 1,
        'basic_setup': 2,
        'advanced_features': 3
      },
      'Mobile': {
        'basic_install': 3,
        'complex_vehicle': 4,
        'fleet_deployment': 5
      },
      'Fixed': {
        'indoor_repeater': 4,
        'outdoor_repeater': 5,
        'multi_site_system': 5
      }
    };
  }

  /**
   * Build comprehensive compatibility matrix for all products
   */
  async buildCompatibilityMatrix() {
    console.log('🔧 Building comprehensive compatibility matrix...');

    try {
      // Get all products from enhanced database
      const products = await this.getAllProducts();
      console.log(`📊 Processing ${products.length} products for compatibility...`);

      let compatibilityCount = 0;

      // Build radio-to-accessory compatibility
      for (const radio of products.filter(p => p.category === 'Portable Radios' || p.category === 'Mobile Radios')) {
        const accessories = products.filter(p => p.category === 'Accessories');

        for (const accessory of accessories) {
          const compatibility = this.determineCompatibility(radio, accessory);
          if (compatibility.compatible) {
            await this.storeCompatibility(radio.id, accessory.id, compatibility);
            compatibilityCount++;
          }
        }
      }

      // Build radio-to-repeater system compatibility
      for (const radio of products.filter(p => p.category === 'Portable Radios' || p.category === 'Mobile Radios')) {
        const repeaters = products.filter(p => p.category === 'Repeaters');

        for (const repeater of repeaters) {
          const compatibility = this.determineSystemCompatibility(radio, repeater);
          if (compatibility.compatible) {
            await this.storeCompatibility(radio.id, repeater.id, compatibility);
            compatibilityCount++;
          }
        }
      }

      // Build accessory-to-accessory compatibility (e.g., battery to charger)
      await this.buildAccessoryCompatibility(products);

      console.log(`✅ Built ${compatibilityCount} compatibility relationships`);

    } catch (error) {
      console.error('❌ Error building compatibility matrix:', error.message);
    }
  }

  /**
   * Get all products from enhanced database
   */
  async getAllProducts() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM parts_enhanced', (err, products) => {
        if (err) reject(err);
        else resolve(products || []);
      });
    });
  }

  /**
   * Determine compatibility between a radio and accessory
   */
  determineCompatibility(radio, accessory) {
    const result = {
      compatible: false,
      compatibility_type: 'incompatible',
      compatibility_reason: '',
      installation_notes: '',
      configuration_required: false
    };

    // Check frequency band compatibility
    if (accessory.subcategory === 'Antennas') {
      if (radio.frequency_band !== this.getAccessoryFrequencyBand(accessory)) {
        result.compatibility_reason = 'frequency_band_mismatch';
        return result;
      }
    }

    // Check model series compatibility
    const radioSeries = this.getCompatibilityGroup(radio);
    const accessoryCompatibility = this.getAccessoryCompatibility(accessory, radioSeries);

    if (!accessoryCompatibility.compatible) {
      result.compatibility_reason = 'model_series_incompatible';
      return result;
    }

    // Set compatibility details
    result.compatible = true;
    result.compatibility_type = accessoryCompatibility.type;
    result.compatibility_reason = accessoryCompatibility.reason;
    result.installation_notes = accessoryCompatibility.notes;
    result.configuration_required = accessoryCompatibility.configuration_required;

    return result;
  }

  /**
   * Determine system-level compatibility between radio and repeater
   */
  determineSystemCompatibility(radio, repeater) {
    const result = {
      compatible: false,
      compatibility_type: 'incompatible',
      compatibility_reason: '',
      installation_notes: '',
      configuration_required: true
    };

    // Check frequency band match
    if (radio.frequency_band !== repeater.frequency_band) {
      result.compatibility_reason = 'frequency_band_mismatch';
      return result;
    }

    // Check system architecture compatibility
    const radioArchitectures = this.parseJsonField(radio.system_architectures);
    const repeaterArchitectures = this.parseJsonField(repeater.system_architectures);

    const commonArchitectures = radioArchitectures.filter(arch =>
      repeaterArchitectures.includes(arch)
    );

    if (commonArchitectures.length === 0) {
      result.compatibility_reason = 'system_architecture_incompatible';
      return result;
    }

    // Compatible
    result.compatible = true;
    result.compatibility_type = 'required';
    result.compatibility_reason = `system_architecture_match: ${commonArchitectures.join(', ')}`;
    result.installation_notes = `Compatible architectures: ${commonArchitectures.join(', ')}. Programming required.`;
    result.configuration_required = true;

    return result;
  }

  /**
   * Get compatibility group for a radio
   */
  getCompatibilityGroup(radio) {
    if (radio.model_series) {
      if (radio.model_series.includes('R7')) return 'MOTOTRBO R7 series';
      if (radio.model_series.includes('XPR3')) return 'MOTOTRBO XPR3000e series';
      if (radio.model_series.includes('XPR7')) return 'MOTOTRBO XPR7000e series';
      if (radio.model_series.includes('R2') || radio.model_series.includes('CP100')) return 'MOTOTRBO R2 series';
      if (radio.model_series.includes('SL')) return 'MOTOTRBO SL series';
    }
    return 'MOTOTRBO'; // Default
  }

  /**
   * Get accessory compatibility for a radio series
   */
  getAccessoryCompatibility(accessory, radioSeries) {
    const subcategory = accessory.subcategory;

    // Battery compatibility
    if (subcategory === 'Batteries') {
      const compatibleBatteries = this.compatibilityRules.battery[radioSeries] || [];
      if (compatibleBatteries.includes(accessory.model)) {
        return {
          compatible: true,
          type: 'required',
          reason: 'battery_compatibility_verified',
          notes: 'Direct replacement battery',
          configuration_required: false
        };
      }
    }

    // Charger compatibility
    if (subcategory === 'Chargers') {
      // Most MOTOTRBO chargers are cross-compatible
      if (accessory.model.includes('PMPN4137') || accessory.model.includes('PMLN6598')) {
        return {
          compatible: true,
          type: 'recommended',
          reason: 'universal_mototrbo_charger',
          notes: 'IMPRES charger compatible with most MOTOTRBO batteries',
          configuration_required: false
        };
      }
    }

    // Antenna compatibility
    if (subcategory === 'Antennas') {
      return {
        compatible: true,
        type: 'optional',
        reason: 'antenna_upgrade',
        notes: 'Check connector type and frequency band',
        configuration_required: false
      };
    }

    // Audio accessories
    if (subcategory === 'Audio') {
      return {
        compatible: true,
        type: 'optional',
        reason: 'audio_accessory',
        notes: 'Standard MOTOTRBO audio connector',
        configuration_required: false
      };
    }

    // Carrying accessories
    if (subcategory === 'Carrying') {
      return {
        compatible: true,
        type: 'optional',
        reason: 'universal_carrying',
        notes: 'Standard belt clip mounting',
        configuration_required: false
      };
    }

    return { compatible: false };
  }

  /**
   * Get frequency band for antenna accessories
   */
  getAccessoryFrequencyBand(accessory) {
    if (accessory.name.toLowerCase().includes('vhf')) return 'VHF';
    if (accessory.name.toLowerCase().includes('uhf')) return 'UHF';
    if (accessory.name.toLowerCase().includes('700')) return '700MHz';
    if (accessory.name.toLowerCase().includes('800')) return '800MHz';
    if (accessory.name.toLowerCase().includes('900')) return '900MHz';
    return 'Universal'; // Default for universal accessories
  }

  /**
   * Build accessory-to-accessory compatibility (e.g., battery to charger)
   */
  async buildAccessoryCompatibility(products) {
    const batteries = products.filter(p => p.subcategory === 'Batteries');
    const chargers = products.filter(p => p.subcategory === 'Chargers');

    for (const battery of batteries) {
      for (const charger of chargers) {
        const compatibility = this.determineBatteryChargerCompatibility(battery, charger);
        if (compatibility.compatible) {
          await this.storeCompatibility(battery.id, charger.id, compatibility);
        }
      }
    }
  }

  /**
   * Determine battery-charger compatibility
   */
  determineBatteryChargerCompatibility(battery, charger) {
    const result = {
      compatible: false,
      compatibility_type: 'incompatible',
      compatibility_reason: '',
      installation_notes: '',
      configuration_required: false
    };

    // IMPRES chargers work with most MOTOTRBO batteries
    if (charger.model.includes('PMPN4137') || charger.model.includes('PMLN6598')) {
      result.compatible = true;
      result.compatibility_type = 'recommended';
      result.compatibility_reason = 'impres_charger_compatibility';
      result.installation_notes = 'IMPRES intelligent charging supported';
      return result;
    }

    // Basic chargers work with standard batteries
    if (charger.model.includes('PMPN4173')) {
      result.compatible = true;
      result.compatibility_type = 'required';
      result.compatibility_reason = 'standard_charger_compatibility';
      result.installation_notes = 'Basic charging supported';
      return result;
    }

    return result;
  }

  /**
   * Store compatibility relationship in database
   */
  async storeCompatibility(primaryId, compatibleId, compatibility) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR IGNORE INTO product_compatibility
        (primary_product_id, compatible_product_id, compatibility_type,
         compatibility_reason, installation_notes, configuration_required)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        primaryId,
        compatibleId,
        compatibility.compatibility_type,
        compatibility.compatibility_reason,
        compatibility.installation_notes,
        compatibility.configuration_required
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Parse JSON field with error handling
   */
  parseJsonField(field) {
    if (!field) return [];
    try {
      return JSON.parse(field);
    } catch (error) {
      return [];
    }
  }

  /**
   * Load industry profiles with specific requirements
   */
  async loadIndustryProfiles() {
    console.log('🏢 Loading industry profiles...');

    const industries = [
      {
        industry_name: 'Education',
        description: 'Schools, universities, and educational facilities',
        typical_user_count_min: 15,
        typical_user_count_max: 150,
        coverage_requirements: JSON.stringify({
          type: 'building',
          range_required: 'indoor',
          special_zones: ['classrooms', 'gymnasiums', 'outdoor_areas']
        }),
        environmental_requirements: JSON.stringify({
          temperature_range: 'standard',
          humidity: 'normal',
          dust_protection: 'moderate'
        }),
        regulatory_requirements: JSON.stringify(['FCC Part 90', 'emergency_compliance']),
        required_features: JSON.stringify(['emergency_button', 'quiet_operation', 'lockdown_capability']),
        preferred_features: JSON.stringify(['group_calling', 'text_messaging', 'location_services']),
        budget_range_min: 15000,
        budget_range_max: 75000,
        installation_considerations: 'Minimal disruption during school hours. Summer installation preferred.',
        compliance_standards: JSON.stringify(['ADA', 'fire_safety', 'emergency_procedures']),
        typical_accessories: JSON.stringify(['batteries', 'chargers', 'speaker_mics', 'carrying_cases']),
        growth_considerations: 'Plan for enrollment growth and additional buildings'
      },
      {
        industry_name: 'Healthcare',
        description: 'Hospitals, clinics, and medical facilities',
        typical_user_count_min: 50,
        typical_user_count_max: 500,
        coverage_requirements: JSON.stringify({
          type: 'campus',
          range_required: 'indoor_outdoor',
          special_zones: ['patient_rooms', 'operating_rooms', 'emergency_areas']
        }),
        environmental_requirements: JSON.stringify({
          temperature_range: 'controlled',
          humidity: 'controlled',
          disinfectable: true,
          biocompatible: true
        }),
        regulatory_requirements: JSON.stringify(['FCC Part 90', 'FDA_medical_device', 'HIPAA_compliance']),
        required_features: JSON.stringify(['disinfectable_surfaces', 'quiet_alerts', 'vibration', 'emergency_button']),
        preferred_features: JSON.stringify(['location_services', 'text_messaging', 'integration_systems']),
        budget_range_min: 45000,
        budget_range_max: 200000,
        installation_considerations: 'Must not interfere with medical equipment. Coordination with biomedical engineering required.',
        compliance_standards: JSON.stringify(['FDA', 'Joint_Commission', 'HIPAA', 'infection_control']),
        typical_accessories: JSON.stringify(['disinfectable_batteries', 'medical_grade_chargers', 'covert_accessories']),
        growth_considerations: 'Integration with nurse call systems and EMR systems'
      },
      {
        industry_name: 'Manufacturing',
        description: 'Factories, plants, and industrial facilities',
        typical_user_count_min: 25,
        typical_user_count_max: 300,
        coverage_requirements: JSON.stringify({
          type: 'industrial',
          range_required: 'large_facility',
          special_zones: ['production_floor', 'warehouse', 'outdoor_yards']
        }),
        environmental_requirements: JSON.stringify({
          temperature_range: 'extreme',
          humidity: 'variable',
          dust_protection: 'high',
          noise_levels: 'high',
          chemical_resistance: 'moderate'
        }),
        regulatory_requirements: JSON.stringify(['FCC Part 90', 'OSHA_compliance', 'intrinsic_safety']),
        required_features: JSON.stringify(['noise_canceling', 'rugged_construction', 'long_battery', 'emergency_button']),
        preferred_features: JSON.stringify(['location_services', 'voice_data', 'integration_systems', 'lone_worker']),
        budget_range_min: 25000,
        budget_range_max: 150000,
        installation_considerations: 'Coordination with production schedules. Hazardous area considerations.',
        compliance_standards: JSON.stringify(['OSHA', 'EPA', 'intrinsic_safety_standards']),
        typical_accessories: JSON.stringify(['rugged_batteries', 'industrial_chargers', 'noise_canceling_mics', 'vehicle_mounting']),
        growth_considerations: 'Integration with SCADA and manufacturing execution systems'
      },
      {
        industry_name: 'Construction',
        description: 'Construction sites and contracting companies',
        typical_user_count_min: 10,
        typical_user_count_max: 100,
        coverage_requirements: JSON.stringify({
          type: 'wide_area',
          range_required: 'outdoor_extended',
          special_zones: ['active_construction', 'equipment_areas', 'site_perimeter']
        }),
        environmental_requirements: JSON.stringify({
          temperature_range: 'extreme',
          humidity: 'variable',
          dust_protection: 'very_high',
          water_resistance: 'high',
          drop_resistance: 'high'
        }),
        regulatory_requirements: JSON.stringify(['FCC Part 90', 'OSHA_compliance', 'site_safety']),
        required_features: JSON.stringify(['weather_resistant', 'rugged_construction', 'long_battery', 'emergency_button']),
        preferred_features: JSON.stringify(['gps_location', 'man_down', 'vehicle_integration', 'multi_site']),
        budget_range_min: 18000,
        budget_range_max: 80000,
        installation_considerations: 'Temporary installations. Equipment security concerns.',
        compliance_standards: JSON.stringify(['OSHA', 'site_safety_standards', 'equipment_safety']),
        typical_accessories: JSON.stringify(['heavy_duty_batteries', 'weatherproof_chargers', 'rugged_cases', 'vehicle_mounting']),
        growth_considerations: 'Multi-site coordination and fleet management'
      },
      {
        industry_name: 'Warehousing',
        description: 'Distribution centers, logistics, and warehousing',
        typical_user_count_min: 20,
        typical_user_count_max: 200,
        coverage_requirements: JSON.stringify({
          type: 'large_facility',
          range_required: 'indoor_extended',
          special_zones: ['high_racks', 'loading_docks', 'office_areas', 'outdoor_yards']
        }),
        environmental_requirements: JSON.stringify({
          temperature_range: 'variable',
          humidity: 'controlled',
          dust_protection: 'moderate',
          vehicle_mounting: true
        }),
        regulatory_requirements: JSON.stringify(['FCC Part 90', 'DOT_compliance', 'warehouse_safety']),
        required_features: JSON.stringify(['vehicle_mounting', 'noise_canceling', 'long_range', 'emergency_button']),
        preferred_features: JSON.stringify(['location_services', 'inventory_integration', 'voice_data', 'fleet_management']),
        budget_range_min: 20000,
        budget_range_max: 120000,
        installation_considerations: 'Vehicle integration required. Coordination with WMS systems.',
        compliance_standards: JSON.stringify(['DOT', 'warehouse_safety', 'OSHA']),
        typical_accessories: JSON.stringify(['vehicle_chargers', 'mobile_antennas', 'noise_canceling_mics', 'fleet_accessories']),
        growth_considerations: 'Integration with warehouse management and logistics systems'
      }
    ];

    for (const industry of industries) {
      await this.storeIndustryProfile(industry);
    }

    console.log(`✅ Loaded ${industries.length} industry profiles`);
  }

  /**
   * Store industry profile in database
   */
  async storeIndustryProfile(industry) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO industry_profiles (
          industry_name, description, typical_user_count_min, typical_user_count_max,
          coverage_requirements, environmental_requirements, regulatory_requirements,
          required_features, preferred_features, budget_range_min, budget_range_max,
          installation_considerations, compliance_standards, typical_accessories, growth_considerations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        industry.industry_name, industry.description, industry.typical_user_count_min,
        industry.typical_user_count_max, industry.coverage_requirements,
        industry.environmental_requirements, industry.regulatory_requirements,
        industry.required_features, industry.preferred_features, industry.budget_range_min,
        industry.budget_range_max, industry.installation_considerations,
        industry.compliance_standards, industry.typical_accessories, industry.growth_considerations
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Load system architecture definitions
   */
  async loadSystemArchitectures() {
    console.log('🏗️ Loading system architectures...');

    const architectures = [
      {
        name: 'Conventional',
        description: 'Traditional single-site radio system with one repeater serving all users',
        max_users: 100,
        max_sites: 1,
        requires_repeater: true,
        requires_licensing: true,
        complexity_level: 2,
        typical_use_cases: JSON.stringify(['small_business', 'single_facility', 'basic_communications']),
        advantages: JSON.stringify(['simple_setup', 'cost_effective', 'reliable']),
        limitations: JSON.stringify(['limited_capacity', 'single_site_only', 'no_trunking']),
        minimum_equipment: JSON.stringify({
          repeater: 1,
          antennas: 2,
          duplexers: 1,
          power_supply: 1
        }),
        cost_multiplier: 1.0
      },
      {
        name: 'IP Site Connect',
        description: 'Multi-site system connecting conventional repeaters via IP network',
        max_users: 250,
        max_sites: 15,
        requires_repeater: true,
        requires_licensing: true,
        complexity_level: 3,
        typical_use_cases: JSON.stringify(['multi_location_business', 'campus_communications', 'regional_coverage']),
        advantages: JSON.stringify(['multi_site_coverage', 'IP_networking', 'scalable']),
        limitations: JSON.stringify(['network_dependency', 'increased_complexity', 'higher_cost']),
        minimum_equipment: JSON.stringify({
          repeater_per_site: 1,
          ip_network: 1,
          site_controller: 1,
          antennas_per_site: 2
        }),
        cost_multiplier: 1.5
      },
      {
        name: 'Capacity Plus',
        description: 'Single-site trunked system providing efficient spectrum usage',
        max_users: 500,
        max_sites: 1,
        requires_repeater: true,
        requires_licensing: true,
        complexity_level: 4,
        typical_use_cases: JSON.stringify(['large_facility', 'high_user_density', 'efficient_spectrum_use']),
        advantages: JSON.stringify(['spectrum_efficiency', 'automatic_channel_assignment', 'scalable_capacity']),
        limitations: JSON.stringify(['single_site_limitation', 'complex_programming', 'higher_equipment_cost']),
        minimum_equipment: JSON.stringify({
          repeater: 1,
          trunking_license: 1,
          antennas: 2,
          site_controller: 1
        }),
        cost_multiplier: 1.8
      },
      {
        name: 'Capacity Max',
        description: 'Multi-site trunked system with advanced features and scalability',
        max_users: 3000,
        max_sites: 48,
        requires_repeater: true,
        requires_licensing: true,
        complexity_level: 5,
        typical_use_cases: JSON.stringify(['enterprise_wide', 'public_safety', 'large_organizations']),
        advantages: JSON.stringify(['maximum_scalability', 'advanced_features', 'enterprise_grade']),
        limitations: JSON.stringify(['high_complexity', 'significant_investment', 'expert_setup_required']),
        minimum_equipment: JSON.stringify({
          master_site: 1,
          repeater_per_site: 1,
          zone_controller: 1,
          ip_network: 1,
          management_system: 1
        }),
        cost_multiplier: 3.0
      },
      {
        name: 'Linked Capacity Plus',
        description: 'Multiple Capacity Plus sites linked together via IP network',
        max_users: 1500,
        max_sites: 15,
        requires_repeater: true,
        requires_licensing: true,
        complexity_level: 4,
        typical_use_cases: JSON.stringify(['multi_facility_enterprise', 'regional_operations', 'distributed_organizations']),
        advantages: JSON.stringify(['multi_site_trunking', 'spectrum_efficiency', 'wide_area_coverage']),
        limitations: JSON.stringify(['complex_setup', 'network_dependency', 'high_cost']),
        minimum_equipment: JSON.stringify({
          capacity_plus_per_site: 1,
          linking_equipment: 1,
          ip_network: 1,
          central_management: 1
        }),
        cost_multiplier: 2.5
      }
    ];

    for (const architecture of architectures) {
      await this.storeSystemArchitecture(architecture);
    }

    console.log(`✅ Loaded ${architectures.length} system architectures`);
  }

  /**
   * Store system architecture in database
   */
  async storeSystemArchitecture(architecture) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO system_architectures (
          name, description, max_users, max_sites, requires_repeater,
          requires_licensing, complexity_level, typical_use_cases, advantages,
          limitations, minimum_equipment, cost_multiplier
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(sql, [
        architecture.name, architecture.description, architecture.max_users,
        architecture.max_sites, architecture.requires_repeater, architecture.requires_licensing,
        architecture.complexity_level, architecture.typical_use_cases, architecture.advantages,
        architecture.limitations, architecture.minimum_equipment, architecture.cost_multiplier
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Initialize enhanced database with all required tables and data
   */
  async initializeEnhancedDatabase() {
    console.log('🚀 Initializing enhanced database system...');

    try {
      // Load and execute enhanced schema
      await this.executeSchemaFile();

      // Build compatibility matrix
      await this.buildCompatibilityMatrix();

      // Load industry profiles
      await this.loadIndustryProfiles();

      // Load system architectures
      await this.loadSystemArchitectures();

      console.log('✅ Enhanced database system initialized successfully!');

    } catch (error) {
      console.error('❌ Error initializing enhanced database:', error.message);
      throw error;
    }
  }

  /**
   * Execute enhanced schema SQL file
   */
  async executeSchemaFile() {
    const fs = require('fs');
    const path = require('path');

    const schemaPath = path.join(__dirname, 'enhanced-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by statements and execute each
    const statements = schema.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await this.executeStatement(statement);
      }
    }
  }

  /**
   * Execute a single SQL statement
   */
  async executeStatement(sql) {
    return new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = CompatibilityBuilder;