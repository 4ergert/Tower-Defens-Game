import { getVisionRange } from '../content/unitBlueprints.js';

export function fogSystem(state) {
  const { TEAM_PLAYER, TEAM_AI } = { TEAM_PLAYER: 1, TEAM_AI: 2 };
  
  // Clear previous visibility
  state.fogState.visibleByTeam[TEAM_PLAYER].clear();
  state.fogState.visibleByTeam[TEAM_AI].clear();

  // For each team, calculate visible cells based on their units' vision ranges
  for (const teamId of [TEAM_PLAYER, TEAM_AI]) {
    const visibleSet = state.fogState.visibleByTeam[teamId];
    const discoveredSet = state.fogState.discoveredByTeam[teamId];

    // Find all units/buildings of this team
    for (const id of state.entities.allIds) {
      const entity = state.entities.byId[id];
      if (!entity || entity.owner?.teamId !== teamId) continue;

      const pos = entity.components?.position;
      if (!pos) continue;

      // Get vision range for this unit
      const visionRange = getVisionRange(entity.type);

      // Mark all visible cells within vision range
      const minX = Math.max(0, Math.floor(pos.x - visionRange));
      const maxX = Math.min(state.map.cols - 1, Math.ceil(pos.x + visionRange));
      const minY = Math.max(0, Math.floor(pos.y - visionRange));
      const maxY = Math.min(state.map.rows - 1, Math.ceil(pos.y + visionRange));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - pos.x;
          const dy = y - pos.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= visionRange) {
            const cellKey = `${x},${y}`;
            visibleSet.add(cellKey);
            discoveredSet.add(cellKey); // Once seen, always discovered
          }
        }
      }
    }
  }

  state.fogState.lastUpdatedTick = state.tick;
}
