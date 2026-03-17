import { TEAM_AI, TEAM_PLAYER } from '../core/constants.js';

export function victorySystem(state) {
  if (state.victoryState.isFinished) return;

  let playerHqAlive = false;
  let aiHqAlive = false;

  for (const id of state.entities.allIds) {
    const entity = state.entities.byId[id];
    if (!entity || entity.type !== 'HQ') continue;
    const hp = entity.components?.health?.hp ?? 0;
    if (hp <= 0) continue;
    if (entity.owner.teamId === TEAM_PLAYER) playerHqAlive = true;
    if (entity.owner.teamId === TEAM_AI) aiHqAlive = true;
  }

  if (playerHqAlive && aiHqAlive) return;

  state.victoryState.isFinished = true;
  if (playerHqAlive) {
    state.victoryState.winnerTeamId = TEAM_PLAYER;
    state.victoryState.reason = 'enemy_hq_destroyed';
  } else if (aiHqAlive) {
    state.victoryState.winnerTeamId = TEAM_AI;
    state.victoryState.reason = 'own_hq_destroyed';
  } else {
    state.victoryState.winnerTeamId = null;
    state.victoryState.reason = 'draw';
  }

  state.stats.matchesPlayed += 1;
}
