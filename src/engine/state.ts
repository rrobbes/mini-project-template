import { GameState, WORLD_SIZE, CORE_RADIUS, PADDLE_DISTANCE, PADDLE_ARC } from './types';

/** Crée l'état initial d'une partie. */
export function createInitialState(seed: number = 1): GameState {
  return {
    worldSize: WORLD_SIZE,
    core: { pos: { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 }, radius: CORE_RADIUS },
    paddle: { angle: 0, arcLength: PADDLE_ARC, distance: PADDLE_DISTANCE },
    projectiles: [],
    score: 0,
    elapsed: 0,
    gameOver: false,
    nextId: 1,
    seed,
  };
}
