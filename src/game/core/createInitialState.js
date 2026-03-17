import {
  FACTION_AI,
  FACTION_HUMAN,
  MAP_COLS,
  MAP_ROWS,
  TEAM_AI,
  TEAM_PLAYER
} from './constants.js';
import { createUnitComponents } from '../content/unitBlueprints.js';

function createEmptyTerrain(cols, rows) {
  const terrain = Array.from({ length: cols * rows }, () => ({ blocked: false }));
  
  // Add strategic obstacles around the map
  function setBlocked(x, y, blocked = true) {
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      terrain[y * cols + x].blocked = blocked;
    }
  }
  
  // Create walls/obstacles in a cross pattern to create tactical zones
  // Left-side wall (columns 7-8, rows 4-13)
  for (let y = 4; y < 14; y++) {
    setBlocked(7, y, true);
  }
  
  // Right-side wall (columns 15-16, rows 4-13)
  for (let y = 4; y < 14; y++) {
    setBlocked(16, y, true);
  }
  
  // Center obstacle boxes for tactical gameplay
  // Top-center obstacle (columns 10-13, rows 2-3)
  for (let x = 10; x <= 13; x++) {
    for (let y = 2; y <= 3; y++) {
      setBlocked(x, y, true);
    }
  }
  
  // Bottom-center obstacle (columns 10-13, rows 14-15)
  for (let x = 10; x <= 13; x++) {
    for (let y = 14; y <= 15; y++) {
      setBlocked(x, y, true);
    }
  }
  
  return terrain;
}

function createEntityFactory(entities) {
  return {
    create(type, owner, components = {}) {
      const id = entities.nextId;
      entities.nextId += 1;
      entities.byId[id] = {
        id,
        type,
        owner,
        components
      };
      entities.allIds.push(id);
      return id;
    }
  };
}

function seedStartingForces(entities) {
  const factory = createEntityFactory(entities);

  const playerOwner = { faction: FACTION_HUMAN, teamId: TEAM_PLAYER };
  const aiOwner = { faction: FACTION_AI, teamId: TEAM_AI };

  factory.create('HQ', playerOwner, {
    position: { x: 2, y: 9 },
    health: { hp: 150, maxHp: 150 }
  });
  factory.create('Worker', playerOwner, createUnitComponents('Worker', 3, 8));
  factory.create('Worker', playerOwner, createUnitComponents('Worker', 3, 9));
  factory.create('Worker', playerOwner, createUnitComponents('Worker', 3, 10));
  factory.create('Scout', playerOwner, createUnitComponents('Scout', 4, 9));

  factory.create('HQ', aiOwner, {
    position: { x: MAP_COLS - 3, y: 9 },
    health: { hp: 150, maxHp: 150 }
  });
  factory.create('Worker', aiOwner, createUnitComponents('Worker', MAP_COLS - 4, 8));
  factory.create('Worker', aiOwner, createUnitComponents('Worker', MAP_COLS - 4, 9));
  factory.create('Worker', aiOwner, createUnitComponents('Worker', MAP_COLS - 4, 10));
  factory.create('Scout', aiOwner, createUnitComponents('Scout', MAP_COLS - 5, 9));
}

function createResourceSpots() {
  return [
    { id: 1, type: 'mineral', x: 5, y: 6, amount: 1200, maxAmount: 1200 },
    { id: 2, type: 'mineral', x: 5, y: 12, amount: 1200, maxAmount: 1200 },
    { id: 3, type: 'energy', x: 3, y: 9, amount: 800, maxAmount: 800 },
    { id: 4, type: 'mineral', x: MAP_COLS - 6, y: 6, amount: 1200, maxAmount: 1200 },
    { id: 5, type: 'mineral', x: MAP_COLS - 6, y: 12, amount: 1200, maxAmount: 1200 },
    { id: 6, type: 'energy', x: MAP_COLS - 4, y: 9, amount: 800, maxAmount: 800 },
    { id: 7, type: 'mineral', x: 11, y: 8, amount: 1000, maxAmount: 1000 },
    { id: 8, type: 'energy', x: 12, y: 10, amount: 700, maxAmount: 700 }
  ];
}

export function createInitialGameState() {
  const state = {
    tick: 0,
    map: {
      cols: MAP_COLS,
      rows: MAP_ROWS,
      terrain: createEmptyTerrain(MAP_COLS, MAP_ROWS)
    },
    entities: {
      byId: {},
      allIds: [],
      nextId: 1
    },
    resourceSpots: createResourceSpots(),
    pendingCommandsByTick: {},
    commandQueue: [],
    players: {
      player: {
        faction: FACTION_HUMAN,
        teamId: TEAM_PLAYER,
        resources: {
          mineral: 300,
          energy: 100,
          data: 50
        }
      },
      ai: {
        faction: FACTION_AI,
        teamId: TEAM_AI,
        resources: {
          mineral: 300,
          energy: 100,
          data: 50
        }
      }
    },
    victoryState: {
      isFinished: false,
      winnerTeamId: null,
      reason: null,
      slowMotionMs: 5000
    },
    fogState: {
      discoveredByTeam: {
        [TEAM_PLAYER]: new Set(),
        [TEAM_AI]: new Set()
      },
      visibleByTeam: {
        [TEAM_PLAYER]: new Set(),
        [TEAM_AI]: new Set()
      }
    },
    productionState: {
      queuesByBuildingId: {},
      progressByBuildingId: {}
    },
    aiState: {
      profile: 'defensive_macro',
      lastDecisionTick: 0
    },
    runtime: {
      paused: false,
      systemMetricsMs: {},
      lastTickDurationMs: 0,
      droppedTicks: 0,
      warnings: []
    },
    stats: {
      commandsReceived: 0,
      commandsExecuted: 0,
      unitsCreated: 0,
      unitsDestroyed: 0,
      matchesPlayed: 0
    }
  };

  seedStartingForces(state.entities);
  state.stats.unitsCreated = state.entities.allIds.length;
  return state;
}
