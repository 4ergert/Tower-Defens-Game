export function cleanupSystem(state) {
  const deadIds = [];

  for (const id of state.entities.allIds) {
    const entity = state.entities.byId[id];
    if (!entity) continue;
    const hp = entity.components?.health?.hp;
    if (typeof hp === 'number' && hp <= 0) {
      deadIds.push(id);
    }
  }

  if (deadIds.length === 0) return;

  const deadIdSet = new Set(deadIds);
  for (const id of deadIds) {
    delete state.entities.byId[id];
    delete state.productionState.queuesByBuildingId[id];
    delete state.productionState.progressByBuildingId[id];
  }

  state.entities.allIds = state.entities.allIds.filter((id) => !deadIdSet.has(id));
  state.stats.unitsDestroyed += deadIds.length;
}
