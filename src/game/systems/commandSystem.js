import { COMMAND_TYPES, TEAM_AI } from '../core/constants.js';
import { getUnitCost, getBuildingCost, getBuildingConstructTicks, getBuildingHp } from '../content/unitBlueprints.js';

const allowed = new Set(Object.values(COMMAND_TYPES));

export function commandSystem(state) {
  let executed = 0;

  const playerTeamId = state.players.player.teamId;

  function isMovableEntity(entity) {
    if (!entity) return false;
    const type = entity.type;
    return type === 'Worker' || type === 'Scout' || type === 'LightInfantry' || type === 'Ranged' || type === 'HeavySoldier';
  }

  function isCombatEntity(entity) {
    if (!entity) return false;
    const type = entity.type;
    return type === 'LightInfantry' || type === 'Ranged' || type === 'HeavySoldier';
  }

  function canBuildingTrainUnit(building, unitType) {
    if (!building) return false;
    const trainByType = {
      HQ: ['Worker', 'Scout'],
      Barracks: ['LightInfantry', 'Ranged', 'HeavySoldier']
    };
    const allowedUnits = trainByType[building.type] || [];
    return allowedUnits.includes(unitType);
  }

  function getSpotById(spotId) {
    if (spotId == null) return null;
    return (state.resourceSpots || []).find((spot) => spot && spot.id === spotId && spot.amount > 0) || null;
  }

  for (const command of state.commandQueue) {
    if (!command || !allowed.has(command.type)) {
      continue;
    }

    executed += 1;

    const issuingTeamId = command.source === 'ai' ? TEAM_AI : playerTeamId;

    if (command.type === COMMAND_TYPES.CANCEL_QUEUE && command.buildingId != null) {
      const building = state.entities.byId[command.buildingId];
      if (!building || building.owner?.teamId !== issuingTeamId) continue;

      const queue = state.productionState.queuesByBuildingId[command.buildingId];
      if (Array.isArray(queue) && queue.length > 0) {
        queue.pop();
      }
    }

    if (command.type === COMMAND_TYPES.QUEUE_UNIT && command.buildingId != null && command.unitType) {
      const building = state.entities.byId[command.buildingId];
      if (!building || building.owner?.teamId !== issuingTeamId) continue;
      if (!canBuildingTrainUnit(building, command.unitType)) continue;

      // Check if team has resources to queue this unit
      const teamResources = issuingTeamId === 1 ? state.players.player.resources : state.players.ai.resources;
      const cost = getUnitCost(command.unitType);
      if (teamResources.mineral < cost.mineral || teamResources.energy < cost.energy) {
        // Not enough resources to queue
        continue;
      }

      if (!state.productionState.queuesByBuildingId[command.buildingId]) {
        state.productionState.queuesByBuildingId[command.buildingId] = [];
      }
      const queue = state.productionState.queuesByBuildingId[command.buildingId];
      if (queue.length < 5) {
        queue.push({ unitType: command.unitType, queuedAt: state.tick });
      }
    }

    if (command.type === COMMAND_TYPES.MOVE_UNITS && Array.isArray(command.unitIds) && command.target) {
      const tx = Math.max(0, Math.min(state.map.cols - 1, Math.round(command.target.x)));
      const ty = Math.max(0, Math.min(state.map.rows - 1, Math.round(command.target.y)));
      for (const unitId of command.unitIds) {
        const entity = state.entities.byId[unitId];
        if (!entity) continue;
        if (entity.owner?.teamId !== issuingTeamId) continue;
        if (!isMovableEntity(entity)) continue;

        if (!entity.components.movement) {
          entity.components.movement = {};
        }
        if (!entity.components.combat) {
          entity.components.combat = {};
        }
        delete entity.components.combat.targetEntityId;
        entity.components.movement.target = { x: tx, y: ty };
      }
    }

    if (command.type === COMMAND_TYPES.GATHER_RESOURCE && Array.isArray(command.unitIds) && command.spotId != null) {
      const targetSpot = getSpotById(command.spotId);
      if (!targetSpot) continue;

      for (const unitId of command.unitIds) {
        const entity = state.entities.byId[unitId];
        if (!entity) continue;
        if (entity.owner?.teamId !== issuingTeamId) continue;
        if (entity.type !== 'Worker') continue;

        if (!entity.components.movement) {
          entity.components.movement = {};
        }
        if (!entity.components.gather) {
          entity.components.gather = {
            phase: 'toSpot',
            targetSpotId: null,
            carryingType: null,
            carryingAmount: 0,
            nextHarvestTick: 0
          };
        }
        if (!entity.components.combat) {
          entity.components.combat = {};
        }

        delete entity.components.combat.targetEntityId;
        entity.components.gather.phase = 'toSpot';
        entity.components.gather.targetSpotId = targetSpot.id;
        entity.components.movement.target = { x: targetSpot.x, y: targetSpot.y };
      }
    }

    if (command.type === COMMAND_TYPES.PLACE_BUILDING && command.workerId != null && command.buildingType && command.x != null && command.y != null) {
      const worker = state.entities.byId[command.workerId];
      if (!worker || worker.type !== 'Worker' || worker.owner?.teamId !== issuingTeamId) continue;
      if (worker.components?.build) continue; // already constructing

      const tx = Math.max(0, Math.min(state.map.cols - 1, Math.round(command.x)));
      const ty = Math.max(0, Math.min(state.map.rows - 1, Math.round(command.y)));

      const terrain = state.map.terrain[ty * state.map.cols + tx];
      if (terrain?.blocked) continue;

      const occupied = state.entities.allIds.some((id) => {
        const e = state.entities.byId[id];
        const pos = e?.components?.position;
        return pos && Math.round(pos.x) === tx && Math.round(pos.y) === ty;
      });
      if (occupied) continue;

      const teamResources = issuingTeamId === 1 ? state.players.player.resources : state.players.ai.resources;
      const cost = getBuildingCost(command.buildingType);
      if (teamResources.mineral < cost.mineral || teamResources.energy < cost.energy) continue;

      teamResources.mineral -= cost.mineral;
      teamResources.energy -= cost.energy;

      worker.components.build = {
        type: command.buildingType,
        targetX: tx,
        targetY: ty,
        ticksRemaining: getBuildingConstructTicks(command.buildingType),
        totalTicks: getBuildingConstructTicks(command.buildingType)
      };
      worker.components.movement = worker.components.movement || {};
      worker.components.movement.target = { x: tx, y: ty };
      delete worker.components.gather;
    }

    if (command.type === COMMAND_TYPES.ATTACK_TARGET && Array.isArray(command.unitIds) && command.targetEntityId != null) {
      const target = state.entities.byId[command.targetEntityId];
      if (!target) continue;

      for (const unitId of command.unitIds) {
        const entity = state.entities.byId[unitId];
        if (!entity) continue;
        if (entity.owner?.teamId !== issuingTeamId) continue;
        if (!isCombatEntity(entity)) continue;
        if (entity.owner?.teamId === target.owner?.teamId) continue;

        if (!entity.components.combat) {
          entity.components.combat = {};
        }

        entity.components.combat.targetEntityId = target.id;
      }
    }
  }

  state.stats.commandsExecuted += executed;
  state.commandQueue = [];
}
