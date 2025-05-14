import * as PIXI from 'pixi.js';

export enum GameState {
  WAITING,
  RUNNING,
  OVER
}

export enum BistyState {
  IDLE,
  RUNNING,
  JUMPING,
  DEAD
}

export interface Obstacle {
  sprite: PIXI.Sprite;
  type: 'cactus-small' | 'cactus-large' | 'bird';
  speed: number;
  update(deltaTime: number): void;
  checkCollision(dinoSprite: PIXI.Sprite): boolean;
  reset(): void;
}

export interface Reward {
  sprite: PIXI.Sprite;
  type: 'coin' | 'star' | 'gem';
  value: number;
  speed: number;
  collected: boolean;
  update(deltaTime: number): void;
  checkCollision(dinoSprite: PIXI.Sprite): boolean;
  reset(): void;
}

export interface Score {
  value: number;
  highScore: number;
  text: PIXI.Text;
  update(deltaTime: number): void;
  reset(): void;
  addPoints(points: number): void;
}

export interface GameConfig {
  width: number;
  height: number;
  gravity: number;
  jumpVelocity: number;
  speed: number;
  speedIncrement: number;
  obstacleInterval: number;
  groundY: number;
} 