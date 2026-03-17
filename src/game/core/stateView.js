function summarizeEntities(entities) {
  const counts = {};
  for (const id of entities.allIds) {
    const entity = entities.byId[id];
    if (!entity) continue;
    counts[entity.type] = (counts[entity.type] || 0) + 1;
  }
  return counts;
}

function toRenderEntities(entities, fogState, playerTeamId) {
  const list = [];
  const visibleSet = fogState?.visibleByTeam?.[playerTeamId];
  
  for (const id of entities.allIds) {
    const entity = entities.byId[id];
    if (!entity) continue;
    const position = entity.components?.position;
    if (!position) continue;

    // Always show player's own units
    const isOwnUnit = entity.owner?.teamId === playerTeamId;
    
    // Check if visible to player (only hide enemy units outside fog of war)
    if (!isOwnUnit && visibleSet) {
      const cellKey = `${Math.round(position.x)},${Math.round(position.y)}`;
      if (!visibleSet.has(cellKey)) {
        // Enemy unit is not visible, skip it
        continue;
      }
    }
    
    list.push({
      id: entity.id,
      type: entity.type,
      teamId: entity.owner?.teamId ?? null,
      faction: entity.owner?.faction ?? null,
      x: position.x,
      y: position.y,
      carryType: entity.components?.gather?.carryingType ?? null,
      carryAmount: entity.components?.gather?.carryingAmount ?? 0,
      hp: entity.components?.health?.hp ?? null,
      maxHp: entity.components?.health?.maxHp ?? null,
      attackTargetId: entity.components?.combat?.targetEntityId ?? null,
      build: entity.components?.build
        ? {
          type: entity.components.build.type,
          targetX: entity.components.build.targetX,
          targetY: entity.components.build.targetY,
          ticksRemaining: entity.components.build.ticksRemaining,
          totalTicks: entity.components.build.totalTicks
        }
        : null,
      target: entity.components?.movement?.target
        ? {
          x: entity.components.movement.target.x,
          y: entity.components.movement.target.y
        }
        : null
    });
  }
  return list;
}

function cloneSetMap(setMap) {
  const result = {};
  for (const key of Object.keys(setMap)) {
    result[key] = Array.from(setMap[key]);
  }
  return result;
}

function summarizeProduction(productionState) {
  const queues = productionState.queuesByBuildingId || {};
  const progress = productionState.progressByBuildingId || {};
  let totalQueued = 0;
  for (const queue of Object.values(queues)) {
    totalQueued += Array.isArray(queue) ? queue.length : 0;
  }

  return {
    activeBuildings: Object.keys(queues).length,
    totalQueued,
    inProgressBuildings: Object.keys(progress).length
  };
}

export function createStateSnapshot(state) {
  const snapshot = {
    tick: state.tick,
    map: {
      cols: state.map.cols,
      rows: state.map.rows,
      terrain: state.map.terrain
    },
    commandQueueLength: state.commandQueue.length,
    pendingBucketCount: Object.keys(state.pendingCommandsByTick).length,
    resourceSpots: (state.resourceSpots || []).map((spot) => ({ ...spot })),
    players: {
      player: {
        teamId: state.players.player.teamId,
        faction: state.players.player.faction,
        resources: { ...state.players.player.resources }
      },
      ai: {
        teamId: state.players.ai.teamId,
        faction: state.players.ai.faction,
        resources: { ...state.players.ai.resources }
      }
    },
    victoryState: { ...state.victoryState },
    fogState: {
      discoveredByTeam: cloneSetMap(state.fogState.discoveredByTeam),
      visibleByTeam: cloneSetMap(state.fogState.visibleByTeam)
    },
    productionState: {
      queuesByBuildingId: { ...state.productionState.queuesByBuildingId },
      progressByBuildingId: { ...state.productionState.progressByBuildingId },
      summary: summarizeProduction(state.productionState)
    },
    aiState: { ...state.aiState },
    runtime: {
      paused: state.runtime.paused,
      systemMetricsMs: { ...state.runtime.systemMetricsMs },
      lastTickDurationMs: state.runtime.lastTickDurationMs,
      droppedTicks: state.runtime.droppedTicks,
      warnings: state.runtime.warnings.slice(-5)
    },
    stats: { ...state.stats },
    entitySummary: summarizeEntities(state.entities),
    entities: toRenderEntities(state.entities, state.fogState, state.players.player.teamId)
  };

  return Object.freeze(snapshot);
}
