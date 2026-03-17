export const UNIT_BLUEPRINTS = {
  Worker: { hp: 24, damage: 2, range: 1.0, cooldownTicks: 14, buildTicks: 42, costMineral: 25, costEnergy: 0, visionRange: 4.5 },
  Scout: { hp: 30, damage: 4, range: 1.25, cooldownTicks: 11, buildTicks: 54, costMineral: 40, costEnergy: 10, visionRange: 6.5 },
  LightInfantry: { hp: 40, damage: 5, range: 1.3, cooldownTicks: 10, buildTicks: 70, costMineral: 60, costEnergy: 20, visionRange: 4.0 },
  Ranged: { hp: 28, damage: 6, range: 3.2, cooldownTicks: 18, buildTicks: 82, costMineral: 70, costEnergy: 40, visionRange: 5.5 },
  HeavySoldier: { hp: 62, damage: 9, range: 1.35, cooldownTicks: 20, buildTicks: 96, costMineral: 100, costEnergy: 50, visionRange: 3.5 }
};

// Buildings
const BUILDING_BLUEPRINTS = {
  HQ:      { visionRange: 8.0, hp: 150, costMineral: 0,   costEnergy: 0,  constructTicks: 0   },
  Barracks:{ visionRange: 5.0, hp: 100, costMineral: 120, costEnergy: 40, constructTicks: 180 }
};

export function getBuildingCost(type) {
  const b = BUILDING_BLUEPRINTS[type];
  if (!b) return { mineral: 999, energy: 999 };
  return { mineral: b.costMineral, energy: b.costEnergy };
}

export function getBuildingConstructTicks(type) {
  return BUILDING_BLUEPRINTS[type]?.constructTicks ?? 120;
}

export function getBuildingHp(type) {
  return BUILDING_BLUEPRINTS[type]?.hp ?? 100;
}

export function createUnitComponents(type, x, y) {
  const base = UNIT_BLUEPRINTS[type] || UNIT_BLUEPRINTS.Worker;
  return {
    position: { x, y },
    health: { hp: base.hp, maxHp: base.hp },
    movement: {},
    combat: {
      damage: base.damage,
      range: base.range,
      cooldownTicks: base.cooldownTicks,
      nextAttackTick: 0,
      targetEntityId: null
    }
  };
}

export function getBuildTicks(type) {
  const base = UNIT_BLUEPRINTS[type];
  if (!base) return 60;
  return base.buildTicks;
}

export function getUnitCost(type) {
  const base = UNIT_BLUEPRINTS[type];
  if (!base) return { mineral: 50, energy: 0 };
  return { mineral: base.costMineral, energy: base.costEnergy };
}

export function getVisionRange(type) {
  // Check buildings first
  if (BUILDING_BLUEPRINTS[type]) {
    return BUILDING_BLUEPRINTS[type].visionRange;
  }
  // Then units
  const base = UNIT_BLUEPRINTS[type];
  if (!base) return 3.0; // Default fallback
  return base.visionRange;
}
