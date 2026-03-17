import { getNextStep } from '../pathfinding/astar.js';

export function movementSystem(state) {
  const speedByType = {
    Worker: 0.25,
    Scout: 0.4,
    LightInfantry: 0.28,
    Ranged: 0.25,
    HeavySoldier: 0.2
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isTerrainBlocked(x, y) {
    const xi = Math.max(0, Math.min(state.map.cols - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(state.map.rows - 1, Math.round(y)));
    const cell = state.map.terrain[yi * state.map.cols + xi];
    return cell && cell.blocked;
  }

  for (const id of state.entities.allIds) {
    const entity = state.entities.byId[id];
    if (!entity) continue;
    const position = entity.components?.position;
    if (!position) continue;

    const speed = speedByType[entity.type] || 0;
    if (speed <= 0) continue;

    let target = entity.components?.movement?.target || null;
    const attackTargetId = entity.components?.combat?.targetEntityId;
    if (attackTargetId != null) {
      const enemy = state.entities.byId[attackTargetId];
      const enemyPos = enemy?.components?.position;
      if (!enemy || !enemyPos) {
        delete entity.components.combat.targetEntityId;
      } else {
        target = { x: enemyPos.x, y: enemyPos.y };
      }
    }
    if (!target) continue;

    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const distance = Math.hypot(dx, dy);

    const attackRange = entity.components?.combat?.range ?? 1.15;
    if (attackTargetId != null && distance <= attackRange) {
      continue;
    }

    if (distance < 0.01) {
      position.x = target.x;
      position.y = target.y;
      delete entity.components.movement.target;
      if (entity.components.pathfinding) {
        delete entity.components.pathfinding.path;
        delete entity.components.pathfinding.pathIndex;
      }
      continue;
    }

    // Use pathfinding to find next waypoint
    const nextStep = getNextStep(entity, target.x, target.y, state.map.cols, state.map.rows, isTerrainBlocked);
    
    if (!nextStep) {
      // No path available, stop moving
      continue;
    }

    // Move toward next waypoint
    const wx = nextStep.x;
    const wy = nextStep.y;
    const wdx = wx - position.x;
    const wdy = wy - position.y;
    const wdist = Math.hypot(wdx, wdy);

    if (wdist < 0.01) {
      // Reached waypoint, continue to next
      continue;
    }

    const step = Math.min(speed, wdist);
    position.x = clamp(position.x + (wdx / wdist) * step, 0, state.map.cols - 1);
    position.y = clamp(position.y + (wdy / wdist) * step, 0, state.map.rows - 1);
  }

  state.runtime.lastMovementTick = state.tick;
}
