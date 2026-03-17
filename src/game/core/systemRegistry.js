import { SYSTEM_ORDER } from './constants.js';
import { aiSystem } from '../systems/aiSystem.js';
import { cleanupSystem } from '../systems/cleanupSystem.js';
import { combatSystem } from '../systems/combatSystem.js';
import { commandSystem } from '../systems/commandSystem.js';
import { economySystem } from '../systems/economySystem.js';
import { fogSystem } from '../systems/fogSystem.js';
import { movementSystem } from '../systems/movementSystem.js';
import { productionSystem } from '../systems/productionSystem.js';
import { victorySystem } from '../systems/victorySystem.js';

const registry = {
  command: commandSystem,
  economy: economySystem,
  production: productionSystem,
  movement: movementSystem,
  combat: combatSystem,
  cleanup: cleanupSystem,
  victory: victorySystem,
  fog: fogSystem,
  ai: aiSystem
};

export function getOrderedSystems() {
  return SYSTEM_ORDER.map((name) => ({
    name,
    run: registry[name]
  }));
}
