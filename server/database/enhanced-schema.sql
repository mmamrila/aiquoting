-- Enhanced Database Schema for Comprehensive Motorola Radio Quoting System
-- This schema supports complex compatibility relationships, learning from quotes, and system architecture understanding

-- Enhanced parts table with comprehensive technical specifications
CREATE TABLE IF NOT EXISTS parts_enhanced (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    brand TEXT,
    model TEXT,
    model_series TEXT, -- e.g., 'R7', 'XPR3000e', 'SLR8000'
    description TEXT,
    cost REAL NOT NULL,
    price REAL NOT NULL,
    labor_hours REAL DEFAULT 0,

    -- Technical Specifications
    frequency_band TEXT, -- VHF, UHF, 700/800, etc.
    frequency_range_min REAL, -- in MHz
    frequency_range_max REAL, -- in MHz
    power_output REAL, -- in Watts
    battery_life REAL, -- in hours
    operating_temperature_min INTEGER, -- in Celsius
    operating_temperature_max INTEGER, -- in Celsius
    ip_rating TEXT, -- IP67, IP68, etc.
    weight REAL, -- in grams
    dimensions_length REAL, -- in mm
    dimensions_width REAL, -- in mm
    dimensions_height REAL, -- in mm

    -- System Compatibility
    system_architectures TEXT, -- JSON array: ["Conventional", "Capacity Plus", "Capacity Max"]
    protocol_support TEXT, -- JSON array: ["Analog", "Digital", "P25", "TETRA"]
    interoperability TEXT, -- JSON array of compatible standards

    -- Regulatory & Licensing
    fcc_id TEXT,
    type_acceptance TEXT, -- Part 90, Part 95, etc.
    requires_licensing BOOLEAN DEFAULT 0,
    license_type TEXT, -- Business, GMRS, Amateur, etc.
    industry_certifications TEXT, -- JSON array: ["TIA-4950", "UL", "ATEX"]

    -- Features & Capabilities
    features TEXT, -- JSON array of feature codes
    audio_features TEXT, -- JSON array: ["noise_canceling", "windporting", "automatic_gain"]
    emergency_features TEXT, -- JSON array: ["lone_worker", "man_down", "emergency_button"]
    connectivity TEXT, -- JSON array: ["Bluetooth", "WiFi", "GPS", "USB"]
    display_type TEXT, -- None, Monochrome, Color
    keypad_type TEXT, -- Limited, Full, None

    -- Installation & Accessories
    installation_complexity INTEGER, -- 1-5 scale
    installation_category TEXT, -- Portable, Mobile, Fixed
    mounting_options TEXT, -- JSON array of mounting types
    antenna_connector TEXT, -- SMA, TNC, N-type, etc.
    accessory_compatibility_group TEXT, -- Standardized compatibility grouping

    -- Inventory & Business
    inventory_qty INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    supplier_part_number TEXT,
    replacement_for TEXT, -- SKU of product this replaces
    superseded_by TEXT, -- SKU of product that replaces this
    lifecycle_status TEXT, -- Current, EOL, Legacy, New
    introduction_date DATE,
    end_of_life_date DATE,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_source TEXT -- FCC, Motorola, Manual, etc.
);

-- Product compatibility relationships (many-to-many)
CREATE TABLE IF NOT EXISTS product_compatibility (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    primary_product_id INTEGER,
    compatible_product_id INTEGER,
    compatibility_type TEXT, -- required, recommended, optional, incompatible
    compatibility_reason TEXT, -- power_match, connector_type, frequency_band, etc.
    installation_notes TEXT,
    configuration_required BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (primary_product_id) REFERENCES parts_enhanced (id),
    FOREIGN KEY (compatible_product_id) REFERENCES parts_enhanced (id),
    UNIQUE(primary_product_id, compatible_product_id, compatibility_type)
);

-- System architecture definitions
CREATE TABLE IF NOT EXISTS system_architectures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL, -- Conventional, IP Site Connect, Capacity Plus, etc.
    description TEXT,
    max_users INTEGER,
    max_sites INTEGER,
    requires_repeater BOOLEAN DEFAULT 1,
    requires_licensing BOOLEAN DEFAULT 1,
    complexity_level INTEGER, -- 1-5 scale
    typical_use_cases TEXT, -- JSON array
    advantages TEXT, -- JSON array
    limitations TEXT, -- JSON array
    minimum_equipment TEXT, -- JSON object defining minimum requirements
    cost_multiplier REAL DEFAULT 1.0 -- Pricing adjustment factor
);

-- Industry-specific requirements and recommendations
CREATE TABLE IF NOT EXISTS industry_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    industry_name TEXT UNIQUE NOT NULL,
    description TEXT,
    typical_user_count_min INTEGER,
    typical_user_count_max INTEGER,
    coverage_requirements TEXT, -- JSON object
    environmental_requirements TEXT, -- JSON object (temperature, humidity, etc.)
    regulatory_requirements TEXT, -- JSON array
    required_features TEXT, -- JSON array
    preferred_features TEXT, -- JSON array
    budget_range_min REAL,
    budget_range_max REAL,
    installation_considerations TEXT,
    compliance_standards TEXT, -- JSON array
    typical_accessories TEXT, -- JSON array of accessory types needed
    growth_considerations TEXT
);

-- Quote learning and outcome tracking
CREATE TABLE IF NOT EXISTS quote_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER,
    outcome TEXT, -- won, lost, pending, cancelled
    outcome_reason TEXT, -- price, features, timing, competitor, etc.
    customer_feedback TEXT,
    actual_installation_cost REAL,
    actual_installation_time REAL, -- in hours
    performance_rating INTEGER, -- 1-5 customer satisfaction
    issues_encountered TEXT, -- JSON array
    lessons_learned TEXT,
    competitor_product TEXT, -- if lost to competitor
    competitor_price REAL, -- if known
    follow_up_opportunities TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes (id)
);

-- AI learning patterns and insights
CREATE TABLE IF NOT EXISTS ai_learning_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT, -- product_combination, industry_preference, price_sensitivity, etc.
    pattern_data TEXT, -- JSON object with pattern details
    confidence_score REAL, -- 0-1 confidence in this pattern
    success_rate REAL, -- Historical success rate when this pattern applied
    sample_size INTEGER, -- Number of quotes this pattern is based on
    industry TEXT, -- If industry-specific
    user_count_range TEXT, -- e.g., "25-50", "100+"
    last_validated DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System design templates based on successful quotes
CREATE TABLE IF NOT EXISTS system_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    industry TEXT,
    user_count_min INTEGER,
    user_count_max INTEGER,
    coverage_type TEXT, -- building, campus, wide_area, etc.
    system_architecture TEXT,
    core_components TEXT, -- JSON array of essential products
    recommended_accessories TEXT, -- JSON array
    optional_upgrades TEXT, -- JSON array
    estimated_cost_per_user REAL,
    installation_time_estimate REAL,
    success_rate REAL, -- Based on historical quotes using this template
    notes TEXT,
    created_from_quote_id INTEGER, -- Reference to successful quote
    usage_count INTEGER DEFAULT 0,
    last_used DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_from_quote_id) REFERENCES quotes (id)
);

-- Enhanced AI interactions with learning context
CREATE TABLE IF NOT EXISTS ai_interactions_enhanced (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    user_input TEXT,
    ai_response TEXT,
    intent_classification TEXT, -- battery_replacement, system_recommendation, compatibility_check, etc.
    entities_extracted TEXT, -- JSON object with extracted entities (models, quantities, etc.)
    confidence_score REAL,
    response_type TEXT, -- product_recommendation, compatibility_info, pricing, etc.
    products_mentioned TEXT, -- JSON array of product SKUs discussed
    quote_generated BOOLEAN DEFAULT 0,
    quote_id INTEGER,
    user_satisfaction INTEGER, -- 1-5 if provided by user
    follow_up_required BOOLEAN DEFAULT 0,
    learning_applied TEXT, -- JSON array of learning patterns that influenced response
    outcome TEXT, -- quote_created, information_provided, escalated, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes (id)
);

-- Frequency licensing database
CREATE TABLE IF NOT EXISTS frequency_licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_type TEXT, -- Business, GMRS, Amateur, Public Safety, etc.
    frequency_band TEXT,
    frequency_min REAL,
    frequency_max REAL,
    geographic_scope TEXT, -- Local, Regional, National
    license_term_years INTEGER,
    application_fee REAL,
    annual_fee REAL,
    requirements TEXT, -- JSON array of requirements
    restrictions TEXT, -- JSON array of restrictions
    application_process TEXT,
    processing_time_days INTEGER,
    regulatory_authority TEXT, -- FCC, ISED, etc.
    country_code TEXT,
    notes TEXT
);

-- Installation complexity and requirements
CREATE TABLE IF NOT EXISTS installation_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    installation_type TEXT, -- basic, standard, complex, specialized
    required_tools TEXT, -- JSON array
    required_expertise TEXT, -- basic, intermediate, advanced, certified
    estimated_time_hours REAL,
    site_requirements TEXT, -- JSON object (power, space, environmental)
    safety_considerations TEXT, -- JSON array
    certification_required BOOLEAN DEFAULT 0,
    certification_type TEXT,
    follow_up_required BOOLEAN DEFAULT 0,
    warranty_impact TEXT,
    testing_required TEXT, -- JSON array of required tests
    documentation_required TEXT, -- JSON array
    FOREIGN KEY (product_id) REFERENCES parts_enhanced (id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parts_enhanced_category ON parts_enhanced(category);
CREATE INDEX IF NOT EXISTS idx_parts_enhanced_model_series ON parts_enhanced(model_series);
CREATE INDEX IF NOT EXISTS idx_parts_enhanced_frequency_band ON parts_enhanced(frequency_band);
CREATE INDEX IF NOT EXISTS idx_parts_enhanced_lifecycle_status ON parts_enhanced(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_product_compatibility_primary ON product_compatibility(primary_product_id);
CREATE INDEX IF NOT EXISTS idx_product_compatibility_compatible ON product_compatibility(compatible_product_id);
CREATE INDEX IF NOT EXISTS idx_quote_outcomes_outcome ON quote_outcomes(outcome);
CREATE INDEX IF NOT EXISTS idx_ai_learning_patterns_type ON ai_learning_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_enhanced_session ON ai_interactions_enhanced(session_id);

-- Views for common queries
CREATE VIEW IF NOT EXISTS v_current_products AS
SELECT * FROM parts_enhanced
WHERE lifecycle_status IN ('Current', 'New')
AND inventory_qty > 0;

CREATE VIEW IF NOT EXISTS v_successful_quotes AS
SELECT q.*, qo.outcome, qo.performance_rating
FROM quotes q
LEFT JOIN quote_outcomes qo ON q.id = qo.quote_id
WHERE qo.outcome = 'won' AND qo.performance_rating >= 4;

CREATE VIEW IF NOT EXISTS v_product_compatibility_matrix AS
SELECT
    p1.sku as primary_sku,
    p1.name as primary_name,
    p2.sku as compatible_sku,
    p2.name as compatible_name,
    pc.compatibility_type,
    pc.compatibility_reason
FROM product_compatibility pc
JOIN parts_enhanced p1 ON pc.primary_product_id = p1.id
JOIN parts_enhanced p2 ON pc.compatible_product_id = p2.id;