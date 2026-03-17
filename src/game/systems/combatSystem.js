export function combatSystem(state) {
  for (const id of state.entities.allIds) {
    const attacker = state.entities.byId[id];
    if (!attacker) continue;

    if (attacker.type === 'Worker') {
      if (attacker.components?.combat?.targetEntityId != null) {
        attacker.components.combat.targetEntityId = null;
      }
      continue;
    }

    const attackerPos = attacker.components?.position;
    const attackerCombat = attacker.components?.combat;
    if (!attackerPos || !attackerCombat) continue;

    const targetId = attackerCombat.targetEntityId;
    if (targetId == null) continue;

    const target = state.entities.byId[targetId];
    if (!target) {
      attackerCombat.targetEntityId = null;
      continue;
    }

    if (target.owner?.teamId === attacker.owner?.teamId) {
      attackerCombat.targetEntityId = null;
      continue;
    }

    const targetPos = target.components?.position;
    const targetHealth = target.components?.health;
    if (!targetPos || !targetHealth) {
      attackerCombat.targetEntityId = null;
      continue;
    }

    const range = attackerCombat.range ?? 1.15;
    const dx = targetPos.x - attackerPos.x;
    const dy = targetPos.y - attackerPos.y;
    const distance = Math.hypot(dx, dy);
    if (distance > range) continue;

    const nextAttackTick = attackerCombat.nextAttackTick ?? 0;
    if (state.tick < nextAttackTick) continue;

    const damage = attackerCombat.damage ?? 1;
    targetHealth.hp = Math.max(0, targetHealth.hp - damage);

    const cooldownTicks = Math.max(1, Math.floor(attackerCombat.cooldownTicks ?? 15));
    attackerCombat.nextAttackTick = state.tick + cooldownTicks;

    if (targetHealth.hp <= 0) {
      attackerCombat.targetEntityId = null;
    }
  }

  state.runtime.lastCombatTick = state.tick;
}
