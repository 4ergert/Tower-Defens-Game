/**
 * A* pathfinding algorithm
 * Finds shortest path from start to goal on a grid
 */

export function findPath(startX, startY, goalX, goalY, cols, rows, isBlocked) {
  // Round to grid cells
  const start = { x: Math.round(startX), y: Math.round(startY) };
  const goal = { x: Math.round(goalX), y: Math.round(goalY) };

  // Start is blocked? Can't start
  if (isBlocked(start.x, start.y)) {
    return null;
  }

  // Already at goal
  if (start.x === goal.x && start.y === goal.y) {
    return [start];
  }

  // Goal is blocked? Can't reach
  if (isBlocked(goal.x, goal.y)) {
    return null;
  }

  function heuristic(x, y) {
    // Manhattan distance
    return Math.abs(x - goal.x) + Math.abs(y - goal.y);
  }

  const openSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map(); // cost from start to node
  const fScore = new Map(); // g + heuristic

  const key = (x, y) => `${x},${y}`;
  const startKey = key(start.x, start.y);
  const goalKey = key(goal.x, goal.y);

  openSet.add(startKey);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start.x, start.y));

  // Direction vectors: 8-connected (including diagonals)
  const neighbors = [
    { x: 1, y: 0 },   // right
    { x: -1, y: 0 },  // left
    { x: 0, y: 1 },   // down
    { x: 0, y: -1 },  // up
    { x: 1, y: 1 },   // diagonal down-right
    { x: -1, y: 1 },  // diagonal down-left
    { x: 1, y: -1 },  // diagonal up-right
    { x: -1, y: -1 }  // diagonal up-left
  ];

  let iterations = 0;
  const maxIterations = cols * rows; // Safety limit

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations += 1;

    // Find node in openSet with lowest fScore
    let current = null;
    let currentKey = null;
    let lowestF = Infinity;
    for (const k of openSet) {
      const f = fScore.get(k) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentKey = k;
      }
    }

    if (!currentKey) break;

    const [cx, cy] = currentKey.split(',').map(Number);

    if (cx === goal.x && cy === goal.y) {
      // Reconstruct path
      const path = [];
      let curr = goalKey;
      while (cameFrom.has(curr)) {
        const [x, y] = curr.split(',').map(Number);
        path.unshift({ x, y });
        curr = cameFrom.get(curr);
      }
      path.unshift({ x: start.x, y: start.y });
      return path;
    }

    openSet.delete(currentKey);

    for (const offset of neighbors) {
      const nx = cx + offset.x;
      const ny = cy + offset.y;

      // Out of bounds
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
        continue;
      }

      // Blocked
      if (isBlocked(nx, ny)) {
        continue;
      }

      const nKey = key(nx, ny);
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;

      if (!(gScore.has(nKey)) || tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, currentKey);
        gScore.set(nKey, tentativeG);
        fScore.set(nKey, tentativeG + heuristic(nx, ny));

        if (!openSet.has(nKey)) {
          openSet.add(nKey);
        }
      }
    }
  }

  // No path found
  return null;
}

/**
 * Get next step toward goal from current position
 * Uses cached path or computes new path
 */
export function getNextStep(entity, goalX, goalY, cols, rows, isBlocked) {
  const currentPos = entity.components?.position;
  if (!currentPos) return null;

  // Check if path is still valid (same goal)
  const pathTarget = entity.components?.pathfinding?.target;
  const path = entity.components?.pathfinding?.path;

  const needsNewPath = !pathTarget || 
                       Math.abs(pathTarget.x - goalX) > 0.1 || 
                       Math.abs(pathTarget.y - goalY) > 0.1;

  if (needsNewPath || !path || path.length === 0) {
    // Compute new path
    const newPath = findPath(currentPos.x, currentPos.y, goalX, goalY, cols, rows, isBlocked);
    
    if (!entity.components.pathfinding) {
      entity.components.pathfinding = {};
    }

    entity.components.pathfinding.path = newPath;
    entity.components.pathfinding.target = { x: goalX, y: goalY };
    entity.components.pathfinding.pathIndex = 0;

    if (!newPath) {
      return null; // No path available
    }

    // Return first step (skip current position)
    if (newPath.length > 1) {
      return newPath[1];
    }
    return null;
  }

  // Follow existing path
  const pathIndex = entity.components.pathfinding.pathIndex ?? 0;
  if (pathIndex + 1 < path.length) {
    // Move to next waypoint
    entity.components.pathfinding.pathIndex = pathIndex + 1;
    return path[pathIndex + 1];
  }

  // Reached end of path
  return { x: goalX, y: goalY };
}
