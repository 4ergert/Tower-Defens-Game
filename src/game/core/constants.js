export const MAP_COLS = 24;
export const MAP_ROWS = 18;

export const TICK_RATE = 15;
export const TICK_MS = 1000 / TICK_RATE;
export const MAX_CATCH_UP_TICKS = 2;

export const UI_EMIT_RATE = 10;
export const UI_EMIT_MS = 1000 / UI_EMIT_RATE;

export const DEV_MODE = true;

export const TEAM_PLAYER = 1;
export const TEAM_AI = 2;

export const FACTION_HUMAN = 'human';
export const FACTION_AI = 'ai';
export const FACTION_NEUTRAL = 'neutral';

export const COMMAND_TYPES = {
  MOVE_UNITS: 'MoveUnits',
  ATTACK_TARGET: 'AttackTarget',
  GATHER_RESOURCE: 'GatherResource',
  PLACE_BUILDING: 'PlaceBuilding',
  QUEUE_UNIT: 'QueueUnit',
  CANCEL_QUEUE: 'CancelQueue'
};

export const SYSTEM_ORDER = [
  'command',
  'economy',
  'production',
  'movement',
  'combat',
  'cleanup',
  'victory',
  'fog',
  'ai'
];
