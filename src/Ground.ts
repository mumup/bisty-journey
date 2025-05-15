import * as PIXI from 'pixi.js';
import { GameConfig } from './types';

export class Ground {
  private ground!: PIXI.TilingSprite;
  private stage: PIXI.Container;
  private config: GameConfig;
  private resources: any;
  private groundSpeed: number;

  constructor(stage: PIXI.Container, config: GameConfig, resources: any) {
    this.stage = stage;
    this.config = config;
    this.resources = resources;
    this.groundSpeed = config.speed;
    this.init();
  }

  private init(): void {
    // 创建地面精灵
    const groundTexture = PIXI.Texture.from('ground');
    
    // 使用TilingSprite创建一个可以无限平铺的地面
    this.ground = new PIXI.TilingSprite(
      groundTexture,
      this.config.width + 10, // 添加一点额外宽度以避免缝隙
      groundTexture.height
    );
    this.ground.position.set(0, this.config.groundY);
    
    // 添加到舞台
    this.stage.addChild(this.ground);
  }

  public update(deltaTime: number): void {
    // 更新地面速度
    // this.groundSpeed = this.config.speed;
    
    // 更新地面的tilePosition而不是position
    // 这样可以实现无缝滚动而不会出现缝隙
    // this.ground.tilePosition.x -= this.groundSpeed * deltaTime;
  }

  public reset(): void {
    this.ground.tilePosition.x = 0;
    this.groundSpeed = this.config.speed;
  }
} 