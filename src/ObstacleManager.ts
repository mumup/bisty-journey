import * as PIXI from 'pixi.js';
import { GameConfig, Obstacle } from './types';

// 创建单个障碍物的类
class CactusObstacle implements Obstacle {
  public sprite: PIXI.Sprite;
  public type: 'cactus-small' | 'cactus-large' | 'bird';
  public speed: number;
  private config: GameConfig;

  constructor(type: 'cactus-small' | 'cactus-large', config: GameConfig) {
    this.type = type;
    this.config = config;
    this.speed = config.speed;
    
    // 创建障碍物精灵
    this.sprite = PIXI.Sprite.from(type);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.scale.set(0.5);
    this.reset();
  }

  public update(deltaTime: number): void {
    this.sprite.position.x -= this.speed * deltaTime;
  }

  public checkCollision(dinoSprite: PIXI.Sprite): boolean {
    const bisty = {
      x: dinoSprite.x - dinoSprite.width / 2 * 0.6,
      y: dinoSprite.y - dinoSprite.height / 2 * 0.6,
      width: dinoSprite.width * 0.6,
      height: dinoSprite.height * 0.6
    };
    
    const obstacle = {
      x: this.sprite.x - this.sprite.width / 2 * 0.7,
      y: this.sprite.y - this.sprite.height * 0.7,
      width: this.sprite.width * 0.7,
      height: this.sprite.height * 0.7
    };
    
    return !(
      bisty.x + bisty.width < obstacle.x ||
      bisty.x > obstacle.x + obstacle.width ||
      bisty.y + bisty.height < obstacle.y ||
      bisty.y > obstacle.y + obstacle.height
    );
  }

  public reset(): void {
    // 重置障碍物位置到屏幕外右侧
    this.sprite.position.set(
      this.config.width + this.sprite.width,
      this.config.groundY
    );
    this.speed = this.config.speed;
  }
}

// 创建鸟类障碍物
class BirdObstacle implements Obstacle {
  public sprite: PIXI.AnimatedSprite;
  public type: 'cactus-small' | 'cactus-large' | 'bird';
  public speed: number;
  private config: GameConfig;
  private birdAnimation: PIXI.Texture[];

  constructor(config: GameConfig) {
    this.type = 'bird';
    this.config = config;
    this.speed = config.speed * 1.2; // 鸟比仙人掌移动更快
    
    // 创建鸟类动画
    this.birdAnimation = [
      PIXI.Texture.from('bird1'),
      PIXI.Texture.from('bird2')
    ];
    
    this.sprite = new PIXI.AnimatedSprite(this.birdAnimation);
    this.sprite.anchor.set(0.5);
    this.sprite.animationSpeed = 0.1;
    this.sprite.play();
    this.reset();
  }

  public update(deltaTime: number): void {
    this.sprite.position.x -= this.speed * deltaTime;
  }

  public checkCollision(dinoSprite: PIXI.Sprite): boolean {
    const bisty = {
      x: dinoSprite.x - dinoSprite.width / 2 * 0.6,
      y: dinoSprite.y - dinoSprite.height / 2 * 0.6,
      width: dinoSprite.width * 0.6,
      height: dinoSprite.height * 0.6
    };
    
    const obstacle = {
      x: this.sprite.x - this.sprite.width / 2 * 0.7,
      y: this.sprite.y - this.sprite.height * 0.7,
      width: this.sprite.width * 0.7,
      height: this.sprite.height * 0.7
    };
    
    return !(
      bisty.x + bisty.width < obstacle.x ||
      bisty.x > obstacle.x + obstacle.width ||
      bisty.y + bisty.height < obstacle.y ||
      bisty.y > obstacle.y + obstacle.height
    );
  }

  public reset(): void {
    // 重置鸟的位置到屏幕外右侧，在空中的随机高度
    const minY = this.config.groundY - 120;
    const maxY = this.config.groundY - 40;
    this.sprite.position.set(
      this.config.width + this.sprite.width,
      minY + Math.random() * (maxY - minY)
    );
    this.speed = this.config.speed * 1.2;
  }
}

export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private stage: PIXI.Container;
  private config: GameConfig;
  private resources: any;
  private running: boolean = false;
  private nextSpawnTime: number = 0;
  private elapsedTime: number = 0;
  private currentSpeed: number;

  constructor(stage: PIXI.Container, config: GameConfig, resources: any) {
    this.stage = stage;
    this.config = config;
    this.resources = resources;
    this.currentSpeed = config.speed;
  }

  public start(): void {
    this.running = true;
    this.spawnObstacle();
  }

  public stop(): void {
    this.running = false;
  }

  public update(deltaTime: number): void {
    if (!this.running) return;
    
    // 更新障碍物
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      
      // 更新障碍物速度随游戏速度增加
      obstacle.speed = this.currentSpeed;
      
      // 更新位置
      obstacle.update(deltaTime);
      
      // 如果障碍物移出屏幕，将其移除
      if (obstacle.sprite.position.x < -obstacle.sprite.width) {
        this.stage.removeChild(obstacle.sprite);
        this.obstacles.splice(i, 1);
      }
    }
    
    // 增加游戏速度
    this.currentSpeed += this.config.speedIncrement * deltaTime;
    
    // 更新时间并检查是否需要生成新障碍物
    this.elapsedTime += deltaTime * 16.67; // 转换为毫秒
    if (this.elapsedTime >= this.nextSpawnTime) {
      this.spawnObstacle();
      this.setNextSpawnTime();
      this.elapsedTime = 0;
    }
  }

  public reset(): void {
    // 清除所有障碍物
    for (const obstacle of this.obstacles) {
      this.stage.removeChild(obstacle.sprite);
    }
    this.obstacles = [];
    this.currentSpeed = this.config.speed;
    this.elapsedTime = 0;
    this.running = true;
    this.setNextSpawnTime();
  }

  public checkCollisions(dinoSprite: PIXI.Sprite): boolean {
    for (const obstacle of this.obstacles) {
      if (obstacle.checkCollision(dinoSprite)) {
        return true;
      }
    }
    return false;
  }

  private spawnObstacle(): void {
    let obstacle: Obstacle;
    
    // 根据难度随机选择障碍物类型
    const rand = Math.random();
    
    if (rand < 0.1 && this.currentSpeed > this.config.speed * 1.2) {
      // 10%的概率生成鸟（只在游戏速度足够快时）
      obstacle = new BirdObstacle(this.config);
    } else if (rand < 0.5) {
      // 40%的概率生成小仙人掌
      obstacle = new CactusObstacle('cactus-small', this.config);
    } else {
      // 50%的概率生成大仙人掌
      obstacle = new CactusObstacle('cactus-large', this.config);
    }
    
    this.obstacles.push(obstacle);
    this.stage.addChild(obstacle.sprite);
  }

  private setNextSpawnTime(): void {
    // 随着游戏速度增加，障碍物间隔减少
    const minTime = this.config.obstacleInterval * 0.7;
    const maxTime = this.config.obstacleInterval * 1.3;
    this.nextSpawnTime = minTime + Math.random() * (maxTime - minTime);
    
    // 根据速度减少间隔时间
    const speedFactor = this.config.speed / this.currentSpeed;
    this.nextSpawnTime *= speedFactor;
  }
} 