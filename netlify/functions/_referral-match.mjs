import schemaDoc from '../../data/referral/contractor.schema.json' with { type: 'json' };
import blockedResults from '../../data/referral/blocked-results.json' with { type: 'json' };

const ID_RE = /^[a-z0-9-]{3,64}$/;
const ZIP3_RE = /^\d{3}$/;
const TAG_RE = /^[a-z0-9_]{2,40}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LANE_TAGS = {
  ac: ['ac'],
  hp: ['heat_pump'],
  fn: ['furnace'],
  ms: ['mini_split'],
  wshp: ['wshp'],
  bl: ['boiler'],
  wh: ['water_heater'],
  sd: ['side_discharge'],
  ts: ['thermostat']
};

const BLOCKED = new Set(blockedResults);
const REASON_SPEC = {
  no_heat_after_basics: 'fuel',
  ignition_or_flame_suspected: 'gas_plus_lp',
  short_cycle_after_basics: 'fuel',
  weak_heat_after_basics: 'fuel',
  blank_tstat_after_basics: ['electrical'],
  tstat_inaccessible: ['any_hvac'],
  thermostat_control_issue: ['electrical'],
  filter_inaccessible: ['any_hvac'],
  airflow_check_inaccessible: ['any_hvac'],
  airflow_after_filter: 'fuel',
  electric_furnace_components: ['electrical'],
  elec_partial_heat: ['electrical'],
  condensate_drain_issue: ['gas_combustion'],
  water_near_electric_furnace: ['electrical'],
  unusual_noise_furnace_wave1: 'fuel',
  fn_advanced_off: ['any_hvac'],
  vent_not_pvc: 'gas_or_oil',
  vent_check_inaccessible: ['gas_combustion'],
  vent_cleared_code_repeats: ['gas_combustion'],
  vent_cleared_still_no_heat: ['gas_combustion'],
  mh_weak_heat_after_basics: ['manufactured_home'],
  hydro_blower_not_running: ['electrical', 'hydronic_hydro_air']
};
const RESULT_SPEC = {
  fn_code_to_pro: 'fuel',
  fn_oil_lockout_pro: ['oil'],
  fn_oil_out: ['oil'],
  fn_breaker_tripped_pro: ['electrical'],
  fn_switch_off_on_purpose: 'any_and_fuel',
  fn_vent_high_pro: ['gas_combustion'],
  fn_vent_ice_pro: ['gas_combustion'],
  fn_condensate_freeze_pro: ['gas_combustion'],
  fn_condensate_pump_pro: ['gas_combustion'],
  fn_hydro_coil_freeze_pro: ['any_hvac', 'hydronic_hydro_air'],
  fn_mh_crossover_pro: ['manufactured_home'],
  fn_mh_listing_card: ['manufactured_home', 'replacement']
};
const CODE_SPEC = {
  PS_STUCK: ['gas_combustion'],
  IGNITION: 'gas_plus_lp',
  POWER: ['electrical'],
  BOARD: 'electrical_and_fuel',
  VENT_MH: ['manufactured_home', 'gas_combustion'],
  STEADY_UNCLEAR: ['manufactured_home', 'gas_combustion'],
  BLOWER: ['electrical'],
  LOCKOUT: ['gas_combustion'],
  OIL_SOFT: ['oil'],
  OIL_HARD: ['oil']
};

export const directorySchema = schemaDoc;

export function boschCodeClass(value) {
  const tokens = String(value || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  if (!tokens.length) return '';
  if (tokens.some(token => token === 'A11' || token === 'B7')) return 'safety';
  const normal = token => /^DF/.test(token) || /^D0/.test(token) || /^D1[1-4]$/.test(token) || token === 'D34' || token === 'DD' || token === 'D61';
  if (tokens.every(normal)) return 'normal';
  return '';
}

export function boschSeriesTags(modelText) {
  const text = String(modelText || '').toUpperCase();
  const parts = text.split(/[^A-Z0-9-]+/).filter(Boolean);
  const has = pattern => parts.some(part => pattern.test(part));
  const regular = has(/^BOHA-(24|36|60)RTB-M18S/);
  const max = has(/^BOHA-(24|36|60)MTB-M18S/);
  const outdoor = regular || max || has(/^BOHA-/);
  const multi = has(/^(?:BIVA-(?:12|18|24|36|48|60)|BIDA-(?:07|09|12|18)|BIWA-(?:07|09|12|18)|BISA-(?:09|12|18)|BIKA-(?:07|09|12|18))VCB-M18X/);
  const premium = has(/^BIVA-(?:24|36|48|60)RCB-M20X/) || has(/^BIVB(?:24|36|48|60)(?![0-9])/);
  const tags = new Set();
  if (regular) tags.add('edge_regular');
  if (max) tags.add('edge_max');
  if (outdoor || multi) tags.add('bosch_ids_edge');
  if (premium) tags.add('bosch_ids_premium_ahu');
  return [...tags];
}

function fuelTags(fuel) {
  if (fuel === 'propane') return ['gas_combustion', 'propane'];
  if (fuel === 'gas') return ['gas_combustion'];
  if (fuel === 'oil') return ['oil'];
  if (fuel === 'electric') return ['electrical'];
  if (fuel === 'hydronic') return ['hydronic_hydro_air'];
  return [];
}

function applySpec(tags, spec, fuel) {
  if (!spec) return;
  if (spec === 'fuel' || spec === 'any_and_fuel' || spec === 'electrical_and_fuel') {
    if (spec !== 'fuel') tags.add(spec === 'any_and_fuel' ? 'any_hvac' : 'electrical');
    const fromFuel = fuelTags(fuel);
    fromFuel.forEach(tag => tags.add(tag));
    if (spec === 'fuel' && !fromFuel.length) tags.add('any_hvac');
    return;
  }
  if (spec === 'gas_plus_lp' || spec === 'gas_or_oil') {
    if (fuel === 'oil') {
      tags.add('oil');
      return;
    }
    tags.add('gas_combustion');
    if (fuel === 'propane') tags.add('propane');
    return;
  }
  spec.forEach(tag => tags.add(tag));
}

export function furnaceSkillTags(summary) {
  const row = summary || {};
  const result = String(row.result_id || '');
  const reason = String(row.fn_reason || '');
  const fuel = String(row.fuel || '');
  const tags = new Set();
  const category = reason.indexOf('code_to_pro_') === 0 ? reason.slice('code_to_pro_'.length) : '';
  if (CODE_SPEC[category]) applySpec(tags, CODE_SPEC[category], fuel);
  else if (RESULT_SPEC[result]) applySpec(tags, RESULT_SPEC[result], fuel);
  else if (result === 'fn_call_pro' || reason) applySpec(tags, REASON_SPEC[reason] || 'fuel', fuel);
  if (row.home_type === 'manufactured_home') tags.add('manufactured_home');
  return [...tags];
}

function dayOk(value) {
  return typeof value === 'string' && DAY_RE.test(value);
}

function brandToken(value) {
  const token = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return TAG_RE.test(token) ? token : '';
}

export function equipmentTags(summary) {
  const row = summary || {};
  if (BLOCKED.has(row.result_id) || boschCodeClass(row.result_id) === 'safety' || boschCodeClass(row.result_id) === 'normal' || boschCodeClass(row.code) === 'safety') return [];
  const tags = new Set(LANE_TAGS[row.lane] || []);
  const brand = brandToken(row.brand);
  if (brand) tags.add(brand);
  if (row.lane === 'fn' || String(row.result_id || '').indexOf('fn_') === 0) furnaceSkillTags(row).forEach(tag => tags.add(tag));
  boschSeriesTags(row.model).forEach(tag => tags.add(tag));
  return [...tags].filter(tag => TAG_RE.test(tag));
}

export function contractorError(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return 'contractor';
  if (!ID_RE.test(row.contractor_id || '')) return 'contractor_id';
  if (typeof row.example !== 'boolean') return 'example';
  if (row.example === true && !/EXAMPLE DATA/.test(String(row.data_notice || ''))) return 'data_notice';
  if (typeof row.company_name !== 'string' || !row.company_name.trim() || row.company_name.length > 120) return 'company_name';
  if (typeof row.active !== 'boolean' || typeof row.paused !== 'boolean') return 'active';
  const license = row.license;
  if (!license || typeof license !== 'object') return 'license';
  for (const key of schemaDoc.license_required) {
    if (typeof license[key] !== 'string' || !license[key].trim()) return 'license';
  }
  if (license.status !== 'active' && license.status !== 'inactive' && license.status !== 'unknown') return 'license';
  if (!dayOk(license.expires_on) || !dayOk(license.checked_on)) return 'license';
  const insurance = row.insurance;
  if (!insurance || !dayOk(insurance.general_liability_expires_on)) return 'insurance';
  if (insurance.workers_comp_expires_on != null && insurance.workers_comp_expires_on !== '' && !dayOk(insurance.workers_comp_expires_on)) return 'insurance';
  if (!Array.isArray(row.brand_certs)) return 'brand_certs';
  for (const cert of row.brand_certs) {
    if (!cert || typeof cert !== 'object') return 'brand_certs';
    for (const key of schemaDoc.brand_cert_required) {
      if (typeof cert[key] !== 'string' || !cert[key].trim()) return 'brand_certs';
    }
    if (!dayOk(cert.verified_on) || !TAG_RE.test(cert.brand)) return 'brand_certs';
  }
  if (!Array.isArray(row.service_zip3s) || !row.service_zip3s.length || row.service_zip3s.some(zip => !ZIP3_RE.test(zip))) return 'service_zip3s';
  if (!Array.isArray(row.equipment_tags) || !row.equipment_tags.length || row.equipment_tags.some(tag => !TAG_RE.test(tag))) return 'equipment_tags';
  if (!Number.isInteger(row.capacity_per_week) || row.capacity_per_week < 0) return 'capacity_per_week';
  if (!Number.isInteger(row.leads_this_week) || row.leads_this_week < 0) return 'leads_this_week';
  return '';
}

function current(day, today) {
  return dayOk(day) && day >= today;
}

function eligible(row, today, includeExample) {
  if (contractorError(row)) return false;
  if (row.example === true && includeExample !== true) return false;
  if (row.active !== true || row.paused === true) return false;
  if (row.license.status !== 'active') return false;
  if (!current(row.license.expires_on, today)) return false;
  if (!current(row.insurance.general_liability_expires_on, today)) return false;
  if (row.leads_this_week >= row.capacity_per_week) return false;
  return true;
}

function score(row, tags) {
  const overlap = row.equipment_tags.filter(tag => tags.has(tag)).length;
  const cert = row.brand_certs.some(item => tags.has(item.brand)) ? 1 : 0;
  return overlap * 10 + cert * 5;
}

export function matchContractor(contractors, lead, options) {
  const opts = options || {};
  const list = Array.isArray(contractors) ? contractors : [];
  const zip3 = String(lead && lead.zip || '').replace(/\D/g, '').slice(0, 3);
  const tags = new Set(lead && lead.equipment_tags || []);
  if (!ZIP3_RE.test(zip3) || !tags.size) return null;
  const today = String(opts.today || new Date().toISOString().slice(0, 10));
  const found = list.filter(row => {
    if (!eligible(row, today, opts.includeExample)) return false;
    if (row.service_zip3s.indexOf(zip3) === -1) return false;
    return row.equipment_tags.some(tag => tags.has(tag));
  });
  found.sort((a, b) => {
    const delta = score(b, tags) - score(a, tags);
    if (delta) return delta;
    const load = a.leads_this_week - b.leads_this_week;
    if (load) return load;
    return a.contractor_id < b.contractor_id ? -1 : 1;
  });
  return found[0] || null;
}
