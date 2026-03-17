const HARVEST_INTERVAL_TICKS = 15;
const HARVEST_RANGE = 0.85;
const DEPOSIT_RANGE = 1.0;
const CARGO_CAPACITY = {
  mineral: 16,
  energy: 10
};

function getTeamResources(state, teamId) {
  if (state.players.player.teamId === teamId) return state.players.player.resources;
  if (state.players.ai.teamId === teamId) return state.players.ai.resources;
  return null;
}

function findNearestSpot(spots, position) {
  let best = null;
  let bestDist = Infinity;
  for (const spot of spots) {
    if (!spot || spot.amount <= 0) continue;
    const dx = spot.x - position.x;
    const dy = spot.y - position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) {
      best = spot;
      bestDist = dist;
    }
  }
  return best;
}

function findNearestOwnHq(state, teamId, position) {
  let best = null;
  let bestDist = Infinity;
  for (const id of state.entities.allIds) {
    const entity = state.entities.byId[id];
    if (!entity) continue;
    if (entity.type !== 'HQ') continue;
    if (entity.owner?.teamId !== teamId) continue;
    const hqPos = entity.components?.position;
    if (!hqPos) continue;
    const dx = hqPos.x - position.x;
    const dy = hqPos.y - position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = entity;
    }
  }
  return best;
}

export function economySystem(state) {
  const spots = state.resourceSpots || [];
  if (spots.length === 0) return;

  for (const id of state.entities.allIds) {
    const entity = state.entities.byId[id];
    if (!entity || entity.type !== 'Worker') continue;

    const position = entity.components?.position;
    if (!position) continue;

    const resources = getTeamResources(state, entity.owner?.teamId);
    if (!resources) continue;

    if (!entity.components.gather) {
      entity.components.gather = {
        phase: 'toSpot',
        targetSpotId: null,
        carryingType: null,
        carryingAmount: 0,
        nextHarvestTick: 0
      };
    }

    const gather = entity.components.gather;
    const isInCombat = entity.components?.combat?.targetEntityId != null;
    if (isInCombat) continue;

    // Respect active movement orders (including manual move commands) and
    // only run gather/deposit decisions when the unit currently has no target.
    if (entity.components?.movement?.target) {
      continue;
    }

    if (gather.phase === 'toBase' && gather.carryingAmount > 0 && gather.carryingType) {
      const hq = findNearestOwnHq(state, entity.owner?.teamId, position);
      const hqPos = hq?.components?.position;
      if (!hqPos) continue;

      const dxHq = hqPos.x - position.x;
      const dyHq = hqPos.y - position.y;
      const distHq = Math.hypot(dxHq, dyHq);

      if (distHq > DEPOSIT_RANGE) {
        entity.components.movement.target = { x: hqPos.x, y: hqPos.y };
        continue;
      }

      resources[gather.carryingType] += gather.carryingAmount;
      gather.carryingAmount = 0;
      gather.carryingType = null;
      gather.phase = 'toSpot';
      gather.targetSpotId = null;
      if (entity.components?.movement?.target) {
        delete entity.components.movement.target;
      }
      continue;
    }

    let targetSpot = spots.find((spot) => spot.id === gather.targetSpotId && spot.amount > 0) || null;
    if (!targetSpot) {
      targetSpot = findNearestSpot(spots, position);
      gather.targetSpotId = targetSpot?.id ?? null;
    }

    if (!targetSpot) {
      if (entity.components?.movement?.target) {
        delete entity.components.movement.target;
      }
      continue;
    }

    const dx = targetSpot.x - position.x;
    const dy = targetSpot.y - position.y;
    const dist = Math.hypot(dx, dy);

    if (dist > HARVEST_RANGE) {
      gather.phase = 'toSpot';
      entity.components.movement.target = { x: targetSpot.x, y: targetSpot.y };
      continue;
    }

    if (entity.components?.movement?.target) {
      delete entity.components.movement.target;
    }

    if (state.tick < gather.nextHarvestTick) continue;

    const cargoCap = CARGO_CAPACITY[targetSpot.type] ?? 0;
    if (cargoCap <= 0) continue;

    const harvested = Math.min(cargoCap, targetSpot.amount);
    targetSpot.amount -= harvested;
    gather.carryingType = targetSpot.type;
    gather.carryingAmount = harvested;
    gather.phase = 'toBase';
    gather.nextHarvestTick = state.tick + HARVEST_INTERVAL_TICKS;

    if (targetSpot.amount <= 0) {
      gather.targetSpotId = null;
    }
  }
}
