const db = require('../database/db');

// Product compatibility and bundling logic
class ProductCompatibilityEngine {
  constructor() {
    this.compatibilityMatrix = {
      // Radio Series Compatibility
      'MOTOTRBO R7 series': {
        batteries: ['PMNN4807'],
        chargers: ['PMPN4137A', 'PMLN6598A', 'PMLN6589A'],
        antennas: ['PMAE4003A', 'PMAD4170'],
        carrying: ['PMLN7238', 'PMLN5870', 'PMLN5868'],
        frequency_bands: ['VHF', 'UHF'],
        audio: ['PMMN4029', 'PMMN4073', 'PMMN4125', 'RLN6562', 'RLN6554A']
      },
      'MOTOTRBO XPR3000e series': {
        batteries: ['PMNN4468', 'PMNN4476A', 'PMNN4544A'],
        chargers: ['PMPN4137A', 'PMLN6598A', 'PMLN6589A'],
        antennas: ['PMAE4003A', 'PMAD4170'],
        carrying: ['PMLN7238', 'PMLN5870', 'PMLN5868'],
        frequency_bands: ['VHF', 'UHF'],
        audio: ['PMMN4029', 'PMMN4073', 'PMMN4125']
      },
      'MOTOTRBO R2 series': {
        batteries: ['PMNN4598'],
        chargers: ['PMPN4173A', 'PMLN6598A', 'PMLN6589A'],
        antennas: ['PMAE4016'],
        carrying: ['PMLN7008', 'PMLN5870', 'PMLN5868'],
        frequency_bands: ['UHF'],
        audio: ['PMMN4029', 'PMMN4073']
      },
      'CP100d': {
        batteries: ['PMNN4476A'],
        chargers: ['PMPN4173A'],
        antennas: ['PMAE4016'],
        carrying: ['PMLN7008', 'PMLN5868'],
        frequency_bands: ['UHF'],
        audio: ['PMMN4029']
      },
      'MOTOTRBO SL series': {
        batteries: ['PMNN4095'],
        chargers: ['PMLN7190'],
        antennas: ['PMAE4095', 'PMAD4145'],
        carrying: ['PMLN7190A'],
        frequency_bands: ['VHF', 'UHF'],
        audio: []
      },
      'MOTOTRBO XPR5000e series': {
        batteries: [], // Mobile radios don't need batteries
        chargers: [],
        antennas: [], // Mobile antennas handled separately
        carrying: [],
        frequency_bands: ['VHF', 'UHF'],
        power_levels: ['25W', '40W', '45W'],
        installation_required: true
      },
      'MOTOTRBO XPR2500': {
        batteries: [],
        chargers: [],
        antennas: [],
        carrying: [],
        frequency_bands: ['VHF', 'UHF'],
        power_levels: ['25W'],
        installation_required: true
      }
    };

    // System architecture compatibility
    this.systemArchitectures = {
      'Conventional': ['SLR1000', 'SLR5700', 'SLR8000'],
      'IP Site Connect': ['SLR5700', 'SLR8000'],
      'Capacity Plus': ['SLR5700', 'SLR8000'],
      'Capacity Max': ['SLR8000'],
      'Linked Capacity Plus': ['SLR8000']
    };

    // Industry-specific recommendations
    this.industryRecommendations = {
      'Education': {
        preferred_radios: ['XPR3300e', 'XPR3500e', 'R2'],
        required_features: ['quiet_operation', 'emergency_features'],
        typical_quantity: 25,
        coverage_type: 'building',
        budget_range: [15000, 25000]
      },
      'Warehousing': {
        preferred_radios: ['R7', 'XPR3500e', 'XPR5350e'],
        required_features: ['rugged', 'noise_canceling', 'vehicle_mounting'],
        typical_quantity: 45,
        coverage_type: 'large_facility',
        budget_range: [20000, 35000]
      },
      'Construction': {
        preferred_radios: ['R7', 'XPR7550e-IS'],
        required_features: ['weather_resistant', 'long_battery', 'multi_site'],
        typical_quantity: 35,
        coverage_type: 'wide_area',
        budget_range: [18000, 30000]
      },
      'Healthcare': {
        preferred_radios: ['XPR7550e', 'R7', 'SL3500e'],
        required_features: ['hospital_grade', 'disinfectable', 'quiet'],
        typical_quantity: 120,
        coverage_type: 'campus',
        budget_range: [45000, 75000]
      },
      'Manufacturing': {
        preferred_radios: ['R7', 'XPR3500e', 'XPR5350e'],
        required_features: ['noise_canceling', '24_7_operation', 'rugged'],
        typical_quantity: 65,
        coverage_type: 'industrial',
        budget_range: [25000, 40000]
      }
    };
  }

  // Get compatible accessories for a radio
  async getCompatibleAccessories(radioSku) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM parts WHERE sku = ?', [radioSku], (err, radio) => {
        if (err) return reject(err);
        if (!radio) return resolve({ accessories: [], message: 'Radio not found' });

        const compatibility = this.findCompatibilityGroup(radio.compatibility);
        if (!compatibility) {
          return resolve({ accessories: [], message: 'No compatibility data found' });
        }

        // Get all compatible accessories
        const accessorySkus = [
          ...compatibility.batteries,
          ...compatibility.chargers,
          ...compatibility.antennas,
          ...compatibility.carrying,
          ...compatibility.audio
        ];

        if (accessorySkus.length === 0) {
          return resolve({ accessories: [], message: 'No accessories available for this radio' });
        }

        const placeholders = accessorySkus.map(() => '?').join(',');
        db.all(
          `SELECT * FROM parts WHERE sku IN (${placeholders}) ORDER BY category, subcategory, price`,
          accessorySkus,
          (err, accessories) => {
            if (err) return reject(err);
            resolve({ accessories, compatibility: compatibility });
          }
        );
      });
    });
  }

  // Recommend a complete system based on requirements
  async recommendSystem(requirements) {
    const {
      industry = 'General',
      userCount = 25,
      coverageType = 'building',
      frequencyBand = 'UHF',
      budget = null,
      specialRequirements = []
    } = requirements;

    try {
      // Get industry recommendations
      const industryData = this.industryRecommendations[industry] || this.industryRecommendations['General'];

      // Determine system architecture needed
      let systemType = 'Conventional';

      // Check for multi-site requirements
      if (requirements.isMultiSite || requirements.siteCount > 1) {
        if (userCount <= 250) {
          systemType = 'IP Site Connect';
        } else if (userCount <= 1500) {
          systemType = 'Linked Capacity Plus';
        } else {
          systemType = 'Capacity Max';
        }
      } else if (userCount > 100) {
        systemType = 'Capacity Max';
      } else if (userCount > 50) {
        systemType = 'Capacity Plus';
      }

      // Get suitable repeaters
      const suitableRepeaters = await this.getSuitableRepeaters(systemType, frequencyBand, userCount);

      // Get suitable radios
      const suitableRadios = await this.getSuitableRadios(industry, frequencyBand, userCount);

      // Calculate accessories needed
      const accessories = await this.calculateAccessories(suitableRadios.radios, userCount);

      // Calculate pricing
      const pricing = this.calculateSystemPricing(suitableRepeaters, suitableRadios, accessories, userCount);

      return {
        systemType,
        repeaters: suitableRepeaters,
        radios: suitableRadios,
        accessories,
        pricing,
        recommendations: this.generateRecommendations(industry, userCount, specialRequirements)
      };

    } catch (error) {
      throw new Error(`Failed to recommend system: ${error.message}`);
    }
  }

  // Find compatibility group for a radio
  findCompatibilityGroup(compatibility) {
    if (!compatibility) return null;

    for (const [group, data] of Object.entries(this.compatibilityMatrix)) {
      if (compatibility.toLowerCase().includes(group.toLowerCase()) ||
          group.toLowerCase().includes(compatibility.toLowerCase())) {
        return data;
      }
    }
    return null;
  }

  // Get suitable repeaters for system requirements
  async getSuitableRepeaters(systemType, frequencyBand, userCount) {
    return new Promise((resolve, reject) => {
      // First try to get any repeaters that match the frequency band
      db.all(
        `SELECT * FROM parts
         WHERE category = 'Repeaters'
         AND frequency_band = ?
         ORDER BY price ASC`,
        [frequencyBand],
        (err, repeaters) => {
          if (err) return reject(err);

          // If no repeaters found for frequency band, get any repeaters
          if (!repeaters || repeaters.length === 0) {
            db.all(
              `SELECT * FROM parts
               WHERE category = 'Repeaters'
               ORDER BY price ASC`,
              [],
              (err, allRepeaters) => {
                if (err) return reject(err);

                // Determine how many repeaters needed
                let repeatersNeeded = 1;
                if (userCount > 100) repeatersNeeded = 2;
                if (userCount > 200) repeatersNeeded = 3;

                resolve({
                  repeaters: allRepeaters || [],
                  quantity: repeatersNeeded,
                  recommended: allRepeaters && allRepeaters[0] ? allRepeaters[0] : null
                });
              }
            );
          } else {
            // Determine how many repeaters needed
            let repeatersNeeded = 1;
            if (userCount > 100) repeatersNeeded = 2;
            if (userCount > 200) repeatersNeeded = 3;

            resolve({
              repeaters,
              quantity: repeatersNeeded,
              recommended: repeaters[0] // Lowest cost option
            });
          }
        }
      );
    });
  }

  // Get suitable radios for industry and requirements
  async getSuitableRadios(industry, frequencyBand, userCount) {
    return new Promise((resolve, reject) => {
      // First try to get radios by frequency band
      db.all(
        `SELECT * FROM parts WHERE category = 'Portable Radios' AND frequency_band = ? ORDER BY price ASC`,
        [frequencyBand],
        (err, radios) => {
          if (err) return reject(err);

          // If no radios found for frequency band, get any portable radios
          if (!radios || radios.length === 0) {
            db.all(
              `SELECT * FROM parts WHERE category = 'Portable Radios' ORDER BY price ASC`,
              [],
              (err, allRadios) => {
                if (err) return reject(err);

                // Categorize by price point
                const budget = allRadios.slice(0, Math.ceil(allRadios.length / 3));
                const midRange = allRadios.slice(Math.ceil(allRadios.length / 3), Math.ceil(allRadios.length * 2 / 3));
                const premium = allRadios.slice(Math.ceil(allRadios.length * 2 / 3));

                resolve({
                  radios: allRadios || [],
                  budget,
                  midRange,
                  premium,
                  recommended: midRange[0] || allRadios[0] || null
                });
              }
            );
          } else {
            // Categorize by price point
            const budget = radios.slice(0, Math.ceil(radios.length / 3));
            const midRange = radios.slice(Math.ceil(radios.length / 3), Math.ceil(radios.length * 2 / 3));
            const premium = radios.slice(Math.ceil(radios.length * 2 / 3));

            resolve({
              radios,
              budget,
              midRange,
              premium,
              recommended: midRange[0] || radios[0] // Default to mid-range or first available
            });
          }
        }
      );
    });
  }

  // Calculate accessories needed for radio quantity
  async calculateAccessories(radios, quantity) {
    if (!radios || radios.length === 0) return [];

    const radio = radios[0]; // Use first radio as template
    const accessories = await this.getCompatibleAccessories(radio.sku);

    if (!accessories.accessories) return [];

    // Standard accessories per radio
    const standardAccessories = {
      batteries: Math.ceil(quantity * 1.2), // 20% extra batteries
      chargers: Math.ceil(quantity / 6), // 1 multi-unit charger per 6 radios
      antennas: quantity, // 1 antenna per radio
      carrying: quantity, // 1 belt clip per radio
      audio: Math.ceil(quantity * 0.3) // 30% get speaker mics
    };

    return {
      accessories: accessories.accessories,
      quantities: standardAccessories,
      total: this.calculateAccessoryTotal(accessories.accessories, standardAccessories)
    };
  }

  // Calculate accessory total cost
  calculateAccessoryTotal(accessories, quantities) {
    let total = 0;

    accessories.forEach(accessory => {
      const subcategory = accessory.subcategory.toLowerCase();
      let quantity = 0;

      if (subcategory.includes('batter')) quantity = quantities.batteries;
      else if (subcategory.includes('charg')) quantity = quantities.chargers;
      else if (subcategory.includes('antenna')) quantity = quantities.antennas;
      else if (subcategory.includes('carry') || subcategory.includes('clip')) quantity = quantities.carrying;
      else if (subcategory.includes('audio')) quantity = quantities.audio;

      if (quantity > 0) {
        total += accessory.price * quantity;
      }
    });

    return total;
  }

  // Calculate complete system pricing
  calculateSystemPricing(repeaters, radios, accessories, userCount) {
    const repeatersData = repeaters.repeaters || [];
    const radiosData = radios.radios || [];

    let repeaterCost = 0;
    if (repeatersData.length > 0 && repeaters.quantity) {
      repeaterCost = repeatersData[0].price * repeaters.quantity;
    }

    let radioCost = 0;
    if (radiosData.length > 0) {
      radioCost = radiosData[0].price * userCount;
    }

    const accessoryCost = accessories.total || 0;
    const installationCost = this.calculateInstallationCost(repeaters.quantity || 0, userCount);
    const licensingCost = 800; // Standard FCC licensing

    const subtotal = repeaterCost + radioCost + accessoryCost + installationCost + licensingCost;
    const tax = subtotal * 0.08; // 8% tax estimate
    const total = subtotal + tax;

    return {
      repeaterCost,
      radioCost,
      accessoryCost,
      installationCost,
      licensingCost,
      subtotal,
      tax,
      total,
      pricePerUser: total / userCount
    };
  }

  // Calculate installation costs
  calculateInstallationCost(repeaterCount, radioCount) {
    const repeaterInstallation = repeaterCount * 8 * 85; // 8 hours per repeater at $85/hour
    const radioConfiguration = radioCount * 0.5 * 85; // 30 minutes per radio
    const systemConfiguration = 4 * 85; // 4 hours system setup

    return repeaterInstallation + radioConfiguration + systemConfiguration;
  }

  // Generate recommendations based on requirements
  generateRecommendations(industry, userCount, specialRequirements) {
    const recommendations = [];

    // Industry-specific recommendations
    if (industry === 'Education') {
      recommendations.push('Consider emergency lockdown features for enhanced security');
      recommendations.push('Quiet operation modes recommended for classroom environments');
    } else if (industry === 'Healthcare') {
      recommendations.push('Hospital-grade equipment required for medical environments');
      recommendations.push('Consider disinfectable surfaces and quiet alert options');
    } else if (industry === 'Construction') {
      recommendations.push('Weather-resistant radios essential for outdoor environments');
      recommendations.push('Extended battery life recommended for long work shifts');
    }

    // User count recommendations
    if (userCount > 50) {
      recommendations.push('Capacity Plus system recommended for improved efficiency');
    }
    if (userCount > 100) {
      recommendations.push('Multiple repeaters may be needed for coverage redundancy');
    }

    // General recommendations
    recommendations.push('Site survey recommended to optimize coverage and performance');
    recommendations.push('Consider future expansion needs when designing the system');

    return recommendations;
  }

  // Get product bundles for specific use cases
  async getProductBundle(bundleType, specifications) {
    const bundles = {
      'starter_portable': {
        name: 'Portable Radio Starter Kit',
        items: ['R2-UHF-403-470', 'PMNN4598', 'PMPN4173A', 'PMLN7008'],
        description: 'Complete starter kit with radio, battery, charger, and belt clip'
      },
      'professional_portable': {
        name: 'Professional Portable Kit',
        items: ['XPR3500e-UHF', 'PMNN4468', 'PMNN4544A', 'PMPN4137A', 'PMLN7238', 'PMMN4029'],
        description: 'Professional kit with display radio, standard and extended batteries, IMPRES charger, belt clip, and speaker mic'
      },
      'premium_portable': {
        name: 'Premium Portable Kit',
        items: ['R7-UHF-403-470', 'PMNN4807', 'PMPN4137A', 'PMLN7238', 'PMMN4125', 'RLN6562'],
        description: 'Premium kit with latest R7 radio, high-capacity battery, IMPRES charger, belt clip, advanced speaker mic, and Bluetooth RSM'
      },
      'mobile_installation': {
        name: 'Mobile Radio Installation Kit',
        items: ['XPR5350e-UHF-25W', 'VEH-INSTALL', 'PROGRAMMING-SERVICE'],
        description: 'Complete mobile installation with radio, mounting kit, and programming'
      }
    };

    const bundle = bundles[bundleType];
    if (!bundle) {
      throw new Error('Bundle type not found');
    }

    return new Promise((resolve, reject) => {
      const placeholders = bundle.items.map(() => '?').join(',');
      db.all(
        `SELECT * FROM parts WHERE sku IN (${placeholders})`,
        bundle.items,
        (err, parts) => {
          if (err) return reject(err);

          const totalCost = parts.reduce((sum, part) => sum + part.cost, 0);
          const totalPrice = parts.reduce((sum, part) => sum + part.price, 0);

          resolve({
            ...bundle,
            parts,
            totalCost,
            totalPrice,
            savings: (parts.reduce((sum, part) => sum + part.price, 0) * 0.95) - totalPrice // 5% bundle discount
          });
        }
      );
    });
  }
}

module.exports = new ProductCompatibilityEngine();