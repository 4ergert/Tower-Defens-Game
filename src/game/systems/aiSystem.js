import { COMMAND_TYPES, TEAM_AI, TEAM_PLAYER } from '../core/constants.js';

function isCombatUnit(entity) {
  if (!entity) return false;
  return entity.type === 'Scout' || entity.type === 'LightInfantry' || entity.type === 'Ranged' || entity.type === 'HeavySoldier';
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getTeamEntities(state, teamId) {
  const result = [];
  for (const id of state.entities.allIds) {
    const entity = state.entities.byId[id];
    if (!entity) continue;
    if (entity.owner?.teamId !== teamId) continue;
    result.push(entity);
  }
  return result;
}

function getPosition(entity) {
  return entity?.components?.position || null;
}

export function aiSystem(state) {
  const aiEntities = getTeamEntities(state, TEAM_AI);
  const playerEntities = getTeamEntities(state, TEAM_PLAYER);
  if (aiEntities.length === 0 || playerEntities.length === 0) {
    state.aiState.lastDecisionTick = state.tick;
    return;
  }

  const aiHq = aiEntities.find((entity) => entity.type === 'HQ');
  const aiHqPos = getPosition(aiHq);
  if (!aiHqPos) {
    state.aiState.lastDecisionTick = state.tick;
    return;
  }

  const playerNearBase = playerEntities.some((entity) => {
    const pos = getPosition(entity);
    if (!pos) return false;
    return distance(pos, aiHqPos) <= 6.5;
  });

  const attackIntervalTicks = playerNearBase ? 15 : 30;
  if (state.tick - (state.aiState.lastDecisionTick || 0) < attackIntervalTicks) {
    return;
  }

  const aiUnits = aiEntities.filter((entity) => isCombatUnit(entity));
  if (aiUnits.length === 0) {
    state.aiState.lastDecisionTick = state.tick;
    return;
  }

  const candidateTargets = playerEntities.filter((entity) => getPosition(entity));
  if (candidateTargets.length === 0) {
    state.aiState.lastDecisionTick = state.tick;
    return;
  }

  // Defensive macro: prioritize closest threat to AI HQ, then pressure player HQ.
  let bestTarget = null;
  let bestScore = Infinity;
  for (const target of candidateTargets) {
    const tPos = getPosition(target);
    if (!tPos) continue;
    const hqDist = distance(tPos, aiHqPos);
    const hqBias = target.type === 'HQ' ? 2.5 : 0;
    const score = hqDist + hqBias;
    if (score < bestScore) {
      bestScore = score;
      bestTarget = target;
    }
  }

  if (!bestTarget) {
    state.aiState.lastDecisionTick = state.tick;
    return;
  }

  const executeOnTick = state.tick + 1;
  if (!state.pendingCommandsByTick[executeOnTick]) {
    state.pendingCommandsByTick[executeOnTick] = [];
  }

  state.pendingCommandsByTick[executeOnTick].push({
    type: COMMAND_TYPES.ATTACK_TARGET,
    unitIds: aiUnits.map((entity) => entity.id),
    targetEntityId: bestTarget.id,
    source: 'ai',
    executeOnTick
  });

  const aiQueue = state.productionState.queuesByBuildingId[aiHq.id] || [];
  const buildIntervalTicks = 45;
  const canBuildNow = state.tick % buildIntervalTicks === 0 && aiQueue.length < 5;
  if (canBuildNow) {
    const workerCount = aiUnits.filter((entity) => entity.type === 'Worker').length;
    const unitType = workerCount < 4 ? 'Worker' : 'Scout';
    state.pendingCommandsByTick[executeOnTick].push({
      type: COMMAND_TYPES.QUEUE_UNIT,
      buildingId: aiHq.id,
      unitType,
      source: 'ai',
      executeOnTick
    });
    state.stats.commandsReceived += 1;
  }

  state.stats.commandsReceived += 1;
  state.aiState.lastDecisionTick = state.tick;
}
