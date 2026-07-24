-- The Great GASPI: Demo Data Seed
-- Seeds territories with realistic (synthetic) data for testing
-- Run AFTER 001_init_schema.sql

-- ============================================================================
-- DATA SOURCES (Attribution)
-- ============================================================================

INSERT INTO data_sources (source_name, url, license_type, attribution_text, last_updated, update_frequency, data_format) VALUES
('HydroSHEDS', 'https://www.hydrosheds.org/', 'CC BY 4.0', 'WWF Global Freshwater Team', NOW(), 'yearly', 'geojson'),
('WorldPop', 'https://www.worldpop.org/', 'CC BY 4.0', 'University of Southampton', NOW(), 'annual', 'raster'),
('FAOSTAT', 'https://www.fao.org/faostat/', 'CC BY-NC-SA 3.0', 'Food and Agriculture Organization of the United Nations', NOW(), 'annual', 'csv'),
('CourtListener', 'https://www.courtlistener.com/', 'Apache 2.0', 'Free Law Project', NOW(), 'realtime', 'api'),
('OpenStreetMap', 'https://www.openstreetmap.org/', 'ODbL', 'OpenStreetMap Contributors', NOW(), 'realtime', 'vector'),
('Open-Elevation', 'https://open-elevation.com/', 'MIT', 'Open-Elevation Contributors', NOW(), 'static', 'api');

-- ============================================================================
-- TERRITORY 1: WEST BANK
-- ============================================================================

INSERT INTO territories (territory_id, name, iso_code, controlling_entity, population, total_area_sqkm, accessible_area_sqkm, area_ratio_accessible, geom)
VALUES (
    'west-bank',
    'West Bank',
    'PSE',
    'Israel',
    2800000,
    5960,
    4200,
    0.705,
    ST_GeomFromText('MULTIPOLYGON(((35.2 31.9, 35.5 31.9, 35.5 32.3, 35.2 32.3, 35.2 31.9)))', 4326)
);

INSERT INTO topographic_data (territory_id, asymmetry_factor_AF, transverse_symmetry_T, basin_elongation_Eb, valley_floor_ratio_Vf, tectonic_activity_level, elevation_advantage_m, viewshed_coverage_pct, chokepoints_controlled, high_ground_advantage_rating, total_population, non_citizen_population, population_density_per_sqkm)
SELECT id, 52.3, 0.68, 0.71, 0.28, 'high', 1050, 68.5, 4, 0.72, 2800000, 2500000, 469.5
FROM territories WHERE territory_id = 'west-bank';

INSERT INTO hydrology_data (territory_id, upstream_sovereign_control, downstream_dependent_status, shared_river_basins, shared_aquifers, dam_count, dam_control_ratio, groundwater_pumping_quota_km3, water_shutoff_levers, desalination_capacity_km3_daily, arable_land_pct, local_crop_production_metric, food_import_dependency_pct, water_security_score, agricultural_autonomy_score, resource_security_composite)
SELECT id, false, true, 3, 2, 5, 0.85, 0.2, 3, 0.02, 18.5, 35.2, 72.3, 28.4, 32.1, 30.8
FROM territories WHERE territory_id = 'west-bank';

INSERT INTO infrastructure_data (territory_id, airspace_control_ratio, cellular_bands_controlled, frequency_spectrum_mhz, eez_claimed_sqkm, eez_accessible_sqkm, major_ports_count, port_access_ratio, border_checkpoint_density_per_km, permit_regime_restrictiveness, transit_permit_required, official_currency, local_currency_circulation, currency_control_ratio, power_grid_self_sufficiency_pct, fuel_import_dependency_pct, infrastructural_control_score)
SELECT id, 1.0, 0, '', 0, 0, 0, 0, 8.2, 9, true, 'NIS', false, 0.95, 5.2, 98.0, 15.3
FROM territories WHERE territory_id = 'west-bank';

INSERT INTO legal_friction_data (territory_id, enforced_system_name, enforced_system_source, enforced_jurisdiction, preferred_system_name, preferred_system_source, preferred_jurisdiction, family_law_divergence, criminal_law_divergence, commercial_law_divergence, personal_status_divergence, legal_friction_density, jurisdictional_autonomy_score, population_under_external_law)
SELECT id, 'Israeli Military Orders', 'military', 'Israeli military law & occupation statutes', 'Palestinian Civil Law', 'secular', 'Palestinian Authority civil courts', 9, 8, 7, 8, 82.5, 18.7, 2500000
FROM territories WHERE territory_id = 'west-bank';

INSERT INTO sovereignty_scores (territory_id, jurisdictional_autonomy_score, resource_security_score, infrastructural_control_score, composite_sovereignty_index, topographic_component, hydrology_component, infrastructure_component, legal_component, calculation_date, data_confidence_level)
SELECT id, 18.7, 30.8, 15.3, 24.2, 72.0, 30.8, 15.3, 18.7, NOW(), 'medium'
FROM territories WHERE territory_id = 'west-bank';

INSERT INTO data_lineage (territory_id, source_id, data_type, ingestion_date, data_version, record_count)
SELECT t.id, ds.id, 'topographic', NOW(), '1.0', 1
FROM territories t, data_sources ds WHERE t.territory_id = 'west-bank' AND ds.source_name = 'HydroSHEDS';

-- ============================================================================
-- TERRITORY 2: WESTERN SAHARA
-- ============================================================================

INSERT INTO territories (territory_id, name, iso_code, controlling_entity, population, total_area_sqkm, accessible_area_sqkm, area_ratio_accessible, geom)
VALUES (
    'western-sahara',
    'Western Sahara',
    'EHS',
    'Morocco',
    597000,
    266000,
    180000,
    0.677,
    ST_GeomFromText('MULTIPOLYGON(((-8.7 27.7, -8.7 21.4, -13.2 21.4, -13.2 27.7, -8.7 27.7)))', 4326)
);

INSERT INTO topographic_data (territory_id, asymmetry_factor_AF, transverse_symmetry_T, basin_elongation_Eb, valley_floor_ratio_Vf, tectonic_activity_level, elevation_advantage_m, viewshed_coverage_pct, chokepoints_controlled, high_ground_advantage_rating, total_population, non_citizen_population, population_density_per_sqkm)
SELECT id, 48.2, 0.52, 0.68, 0.35, 'moderate', 890, 72.3, 2, 0.65, 597000, 400000, 2.25
FROM territories WHERE territory_id = 'western-sahara';

INSERT INTO hydrology_data (territory_id, upstream_sovereign_control, downstream_dependent_status, shared_river_basins, shared_aquifers, dam_count, dam_control_ratio, groundwater_pumping_quota_km3, water_shutoff_levers, desalination_capacity_km3_daily, arable_land_pct, local_crop_production_metric, food_import_dependency_pct, water_security_score, agricultural_autonomy_score, resource_security_composite)
SELECT id, false, false, 1, 1, 2, 0.8, 0.15, 2, 0.01, 0.5, 12.3, 95.2, 18.5, 8.2, 14.5
FROM territories WHERE territory_id = 'western-sahara';

INSERT INTO infrastructure_data (territory_id, airspace_control_ratio, cellular_bands_controlled, frequency_spectrum_mhz, eez_claimed_sqkm, eez_accessible_sqkm, major_ports_count, port_access_ratio, border_checkpoint_density_per_km, permit_regime_restrictiveness, transit_permit_required, official_currency, local_currency_circulation, currency_control_ratio, power_grid_self_sufficiency_pct, fuel_import_dependency_pct, infrastructural_control_score)
SELECT id, 0.95, 1, '900-2100 MHz', 120000, 60000, 2, 0.4, 3.2, 7, true, 'MAD', false, 0.98, 12.5, 88.0, 22.8
FROM territories WHERE territory_id = 'western-sahara';

INSERT INTO legal_friction_data (territory_id, enforced_system_name, enforced_system_source, enforced_jurisdiction, preferred_system_name, preferred_system_source, preferred_jurisdiction, family_law_divergence, criminal_law_divergence, commercial_law_divergence, personal_status_divergence, legal_friction_density, jurisdictional_autonomy_score, population_under_external_law)
SELECT id, 'Moroccan Law', 'occupation', 'Moroccan civil & military law', 'Sahrawi Customary Law', 'customary', 'POLISARIO tribal courts', 7, 6, 5, 7, 65.3, 28.5, 400000
FROM territories WHERE territory_id = 'western-sahara';

INSERT INTO sovereignty_scores (territory_id, jurisdictional_autonomy_score, resource_security_score, infrastructural_control_score, composite_sovereignty_index, topographic_component, hydrology_component, infrastructure_component, legal_component, calculation_date, data_confidence_level)
SELECT id, 28.5, 14.5, 22.8, 22.1, 65.0, 14.5, 22.8, 28.5, NOW(), 'low'
FROM territories WHERE territory_id = 'western-sahara';

-- ============================================================================
-- TERRITORY 3: NORTHERN CYPRUS
-- ============================================================================

INSERT INTO territories (territory_id, name, iso_code, controlling_entity, population, total_area_sqkm, accessible_area_sqkm, area_ratio_accessible, geom)
VALUES (
    'northern-cyprus',
    'Northern Cyprus',
    'TRNC',
    'Turkey',
    312000,
    3355,
    2800,
    0.835,
    ST_GeomFromText('MULTIPOLYGON(((33.6 35.3, 34.6 35.3, 34.6 35.7, 33.6 35.7, 33.6 35.3)))', 4326)
);

INSERT INTO topographic_data (territory_id, asymmetry_factor_AF, transverse_symmetry_T, basin_elongation_Eb, valley_floor_ratio_Vf, tectonic_activity_level, elevation_advantage_m, viewshed_coverage_pct, chokepoints_controlled, high_ground_advantage_rating, total_population, non_citizen_population, population_density_per_sqkm)
SELECT id, 51.8, 0.61, 0.73, 0.32, 'high', 1025, 70.2, 3, 0.68, 312000, 100000, 93.0
FROM territories WHERE territory_id = 'northern-cyprus';

INSERT INTO hydrology_data (territory_id, upstream_sovereign_control, downstream_dependent_status, shared_river_basins, shared_aquifers, dam_count, dam_control_ratio, groundwater_pumping_quota_km3, water_shutoff_levers, desalination_capacity_km3_daily, arable_land_pct, local_crop_production_metric, food_import_dependency_pct, water_security_score, agricultural_autonomy_score, resource_security_composite)
SELECT id, false, true, 2, 1, 8, 0.75, 0.25, 3, 0.03, 28.3, 48.5, 65.2, 38.2, 42.1, 40.3
FROM territories WHERE territory_id = 'northern-cyprus';

INSERT INTO infrastructure_data (territory_id, airspace_control_ratio, cellular_bands_controlled, frequency_spectrum_mhz, eez_claimed_sqkm, eez_accessible_sqkm, major_ports_count, port_access_ratio, border_checkpoint_density_per_km, permit_regime_restrictiveness, transit_permit_required, official_currency, local_currency_circulation, currency_control_ratio, power_grid_self_sufficiency_pct, fuel_import_dependency_pct, infrastructural_control_score)
SELECT id, 0.9, 1, '800-2100 MHz', 75000, 50000, 3, 0.75, 5.2, 6, true, 'TRY', false, 0.85, 28.5, 72.3, 42.5
FROM territories WHERE territory_id = 'northern-cyprus';

INSERT INTO legal_friction_data (territory_id, enforced_system_name, enforced_system_source, enforced_jurisdiction, preferred_system_name, preferred_system_source, preferred_jurisdiction, family_law_divergence, criminal_law_divergence, commercial_law_divergence, personal_status_divergence, legal_friction_density, jurisdictional_autonomy_score, population_under_external_law)
SELECT id, 'Turkish Law', 'military', 'Turkish civil & military law', 'Greek Cypriot Law', 'secular', 'Republic of Cyprus courts', 6, 5, 4, 5, 52.3, 38.5, 100000
FROM territories WHERE territory_id = 'northern-cyprus';

INSERT INTO sovereignty_scores (territory_id, jurisdictional_autonomy_score, resource_security_score, infrastructural_control_score, composite_sovereignty_index, topographic_component, hydrology_component, infrastructure_component, legal_component, calculation_date, data_confidence_level)
SELECT id, 38.5, 40.3, 42.5, 40.2, 68.0, 40.3, 42.5, 38.5, NOW(), 'medium'
FROM territories WHERE territory_id = 'northern-cyprus';

-- ============================================================================
-- TERRITORY 4: TRANSNISTRIA
-- ============================================================================

INSERT INTO territories (territory_id, name, iso_code, controlling_entity, population, total_area_sqkm, accessible_area_sqkm, area_ratio_accessible, geom)
VALUES (
    'transnistria',
    'Transnistria',
    'PMR',
    'Russia',
    475000,
    4163,
    3500,
    0.841,
    ST_GeomFromText('MULTIPOLYGON(((28.5 46.3, 29.5 46.3, 29.5 48.8, 28.5 48.8, 28.5 46.3)))', 4326)
);

INSERT INTO topographic_data (territory_id, asymmetry_factor_AF, transverse_symmetry_T, basin_elongation_Eb, valley_floor_ratio_Vf, tectonic_activity_level, elevation_advantage_m, viewshed_coverage_pct, chokepoints_controlled, high_ground_advantage_rating, total_population, non_citizen_population, population_density_per_sqkm)
SELECT id, 49.5, 0.55, 0.82, 0.42, 'low', 650, 55.2, 2, 0.52, 475000, 50000, 114.0
FROM territories WHERE territory_id = 'transnistria';

INSERT INTO hydrology_data (territory_id, upstream_sovereign_control, downstream_dependent_status, shared_river_basins, shared_aquifers, dam_count, dam_control_ratio, groundwater_pumping_quota_km3, water_shutoff_levers, desalination_capacity_km3_daily, arable_land_pct, local_crop_production_metric, food_import_dependency_pct, water_security_score, agricultural_autonomy_score, resource_security_composite)
SELECT id, false, false, 1, 1, 3, 0.6, 0.3, 2, 0.0, 72.5, 75.2, 45.3, 52.8, 65.2, 58.5
FROM territories WHERE territory_id = 'transnistria';

INSERT INTO infrastructure_data (territory_id, airspace_control_ratio, cellular_bands_controlled, frequency_spectrum_mhz, eez_claimed_sqkm, eez_accessible_sqkm, major_ports_count, port_access_ratio, border_checkpoint_density_per_km, permit_regime_restrictiveness, transit_permit_required, official_currency, local_currency_circulation, currency_control_ratio, power_grid_self_sufficiency_pct, fuel_import_dependency_pct, infrastructural_control_score)
SELECT id, 0.85, 1, '900-2100 MHz', 0, 0, 0, 0, 4.5, 8, true, 'PRB', true, 0.6, 45.2, 55.0, 52.3
FROM territories WHERE territory_id = 'transnistria';

INSERT INTO legal_friction_data (territory_id, enforced_system_name, enforced_system_source, enforced_jurisdiction, preferred_system_name, preferred_system_source, preferred_jurisdiction, family_law_divergence, criminal_law_divergence, commercial_law_divergence, personal_status_divergence, legal_friction_density, jurisdictional_autonomy_score, population_under_external_law)
SELECT id, 'Russian Law', 'foreign', 'Russian civil & constitutional law', 'Moldovan Law', 'secular', 'Republic of Moldova courts', 5, 4, 4, 4, 45.2, 48.5, 50000
FROM territories WHERE territory_id = 'transnistria';

INSERT INTO sovereignty_scores (territory_id, jurisdictional_autonomy_score, resource_security_score, infrastructural_control_score, composite_sovereignty_index, topographic_component, hydrology_component, infrastructure_component, legal_component, calculation_date, data_confidence_level)
SELECT id, 48.5, 58.5, 52.3, 52.1, 52.0, 58.5, 52.3, 48.5, NOW(), 'medium'
FROM territories WHERE territory_id = 'transnistria';

-- ============================================================================
-- VERIFY DATA
-- ============================================================================

SELECT 'Demo data seeding complete!' as status;
SELECT COUNT(*) as territory_count FROM territories;
SELECT COUNT(*) as score_count FROM sovereignty_scores;
