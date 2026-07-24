-- The Great GASPI: Database Schema
-- PostGIS enabled PostgreSQL database for geopolitical sovereignty analysis

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- DATA ATTRIBUTION
-- ============================================================================

CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(255) NOT NULL UNIQUE,
    url TEXT,
    license_type VARCHAR(100),
    attribution_text TEXT,
    last_updated TIMESTAMP DEFAULT NOW(),
    update_frequency VARCHAR(50),
    data_format VARCHAR(50)
);

-- ============================================================================
-- TERRITORIES
-- ============================================================================

CREATE TABLE territories (
    id SERIAL PRIMARY KEY,
    territory_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    iso_code VARCHAR(10),
    controlling_entity VARCHAR(255),
    population BIGINT,
    total_area_sqkm DECIMAL(12, 2),
    accessible_area_sqkm DECIMAL(12, 2),
    area_ratio_accessible DECIMAL(5, 3),
    geom GEOMETRY(MULTIPOLYGON, 4326),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_territories_id ON territories(territory_id);
CREATE INDEX idx_territories_geom ON territories USING GIST(geom);

-- ============================================================================
-- PILLAR 1: TOPOGRAPHIC DATA
-- ============================================================================

CREATE TABLE topographic_data (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    asymmetry_factor_AF DECIMAL(10, 2),
    transverse_symmetry_T DECIMAL(10, 3),
    basin_elongation_Eb DECIMAL(10, 3),
    valley_floor_ratio_Vf DECIMAL(10, 3),
    tectonic_activity_level VARCHAR(50),
    elevation_advantage_m INTEGER,
    viewshed_coverage_pct DECIMAL(5, 2),
    chokepoints_controlled INTEGER,
    high_ground_advantage_rating DECIMAL(5, 2),
    total_population BIGINT,
    non_citizen_population BIGINT,
    population_density_per_sqkm DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_topographic_territory ON topographic_data(territory_id);

-- ============================================================================
-- PILLAR 2: HYDROLOGY DATA
-- ============================================================================

CREATE TABLE hydrology_data (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    upstream_sovereign_control BOOLEAN,
    downstream_dependent_status BOOLEAN,
    shared_river_basins INTEGER,
    shared_aquifers INTEGER,
    dam_count INTEGER,
    dam_control_ratio DECIMAL(5, 3),
    groundwater_pumping_quota_km3 DECIMAL(10, 2),
    water_shutoff_levers INTEGER,
    desalination_capacity_km3_daily DECIMAL(10, 2),
    arable_land_pct DECIMAL(5, 2),
    local_crop_production_metric DECIMAL(10, 2),
    food_import_dependency_pct DECIMAL(5, 2),
    water_security_score DECIMAL(5, 2),
    agricultural_autonomy_score DECIMAL(5, 2),
    resource_security_composite DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hydrology_territory ON hydrology_data(territory_id);

-- ============================================================================
-- PILLAR 3: INFRASTRUCTURE DATA
-- ============================================================================

CREATE TABLE infrastructure_data (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    airspace_control_ratio DECIMAL(5, 2),
    cellular_bands_controlled INTEGER,
    frequency_spectrum_mhz VARCHAR(100),
    eez_claimed_sqkm DECIMAL(12, 2),
    eez_accessible_sqkm DECIMAL(12, 2),
    major_ports_count INTEGER,
    port_access_ratio DECIMAL(5, 2),
    border_checkpoint_density_per_km DECIMAL(10, 2),
    permit_regime_restrictiveness INTEGER,
    transit_permit_required BOOLEAN,
    official_currency VARCHAR(10),
    local_currency_circulation BOOLEAN,
    currency_control_ratio DECIMAL(5, 2),
    power_grid_self_sufficiency_pct DECIMAL(5, 2),
    fuel_import_dependency_pct DECIMAL(5, 2),
    infrastructural_control_score DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_infrastructure_territory ON infrastructure_data(territory_id);

-- ============================================================================
-- PILLAR 4: LEGAL FRICTION DATA
-- ============================================================================

CREATE TABLE legal_friction_data (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    enforced_system_name VARCHAR(255),
    enforced_system_source VARCHAR(100),
    enforced_jurisdiction TEXT,
    preferred_system_name VARCHAR(255),
    preferred_system_source VARCHAR(100),
    preferred_jurisdiction TEXT,
    family_law_divergence INTEGER,
    criminal_law_divergence INTEGER,
    commercial_law_divergence INTEGER,
    personal_status_divergence INTEGER,
    legal_friction_density DECIMAL(5, 2),
    jurisdictional_autonomy_score DECIMAL(5, 2),
    population_under_external_law BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_legal_territory ON legal_friction_data(territory_id);

-- ============================================================================
-- SOVEREIGNTY SCORES
-- ============================================================================

CREATE TABLE sovereignty_scores (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    jurisdictional_autonomy_score DECIMAL(5, 2),
    resource_security_score DECIMAL(5, 2),
    infrastructural_control_score DECIMAL(5, 2),
    composite_sovereignty_index DECIMAL(5, 2),
    topographic_component DECIMAL(5, 2),
    hydrology_component DECIMAL(5, 2),
    infrastructure_component DECIMAL(5, 2),
    legal_component DECIMAL(5, 2),
    calculation_date TIMESTAMP DEFAULT NOW(),
    data_confidence_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scores_territory ON sovereignty_scores(territory_id);

-- ============================================================================
-- SPATIAL FEATURES
-- ============================================================================

CREATE TABLE spatial_features (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    feature_type VARCHAR(100),
    access_status VARCHAR(50),
    elevation_m INTEGER,
    geom GEOMETRY(POLYGON, 4326),
    properties JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_spatial_territory ON spatial_features(territory_id);
CREATE INDEX idx_spatial_geom ON spatial_features USING GIST(geom);

-- ============================================================================
-- POPULATION DENSITY POCKETS
-- ============================================================================

CREATE TABLE population_density_pockets (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    name VARCHAR(255),
    density_per_sqkm DECIMAL(10, 2),
    population INTEGER,
    geom GEOMETRY(POINT, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_density_territory ON population_density_pockets(territory_id);
CREATE INDEX idx_density_geom ON population_density_pockets USING GIST(geom);

-- ============================================================================
-- BORDER CHECKPOINTS
-- ============================================================================

CREATE TABLE border_checkpoints (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    name VARCHAR(255),
    checkpoint_type VARCHAR(50),
    control_status VARCHAR(50),
    permit_requirement BOOLEAN,
    geom GEOMETRY(POINT, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checkpoints_territory ON border_checkpoints(territory_id);
CREATE INDEX idx_checkpoints_geom ON border_checkpoints USING GIST(geom);

-- ============================================================================
-- PHYSICAL BARRIERS
-- ============================================================================

CREATE TABLE physical_barriers (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    type VARCHAR(100),
    description TEXT,
    length_km DECIMAL(12, 2),
    impact_score DECIMAL(5, 2),
    geom GEOMETRY(LINESTRING, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_barriers_territory ON physical_barriers(territory_id);
CREATE INDEX idx_barriers_geom ON physical_barriers USING GIST(geom);

-- ============================================================================
-- RIVER BASINS
-- ============================================================================

CREATE TABLE river_basins (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    river_name VARCHAR(255),
    upstream_position BOOLEAN,
    downstream_dependence BOOLEAN,
    flow_direction VARCHAR(10),
    average_discharge_m3_s DECIMAL(12, 2),
    geom GEOMETRY(LINESTRING, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rivers_territory ON river_basins(territory_id);
CREATE INDEX idx_rivers_geom ON river_basins USING GIST(geom);

-- ============================================================================
-- DATA LINEAGE
-- ============================================================================

CREATE TABLE data_lineage (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    source_id INTEGER REFERENCES data_sources(id),
    data_type VARCHAR(100),
    ingestion_date TIMESTAMP DEFAULT NOW(),
    data_version VARCHAR(50),
    record_count INTEGER
);

CREATE INDEX idx_lineage_territory ON data_lineage(territory_id);
CREATE INDEX idx_lineage_source ON data_lineage(source_id);
