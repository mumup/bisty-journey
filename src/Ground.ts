import * as PIXI from 'pixi.js';
import { GameConfig } from './types';

export class Ground {
  private sprites: PIXI.TilingSprite[] = [];
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
    
    // 创建两个相邻的地面精灵以实现无缝滚动
    const ground1 = new PIXI.TilingSprite(
      groundTexture,
      this.config.width,
      groundTexture.height
    );
    ground1.position.set(0, this.config.groundY);
    
    const ground2 = new PIXI.TilingSprite(
      groundTexture,
      this.config.width,
      groundTexture.height
    );
    ground2.position.set(this.config.width, this.config.groundY);
    
    this.sprites.push(ground1, ground2);
    
    // 添加到舞台
    this.stage.addChild(ground1, ground2);
  }

  public update(deltaTime: number): void {
    // 更新地面速度
    this.groundSpeed = this.config.speed;
    
    // 更新地面位置
    for (const sprite of this.sprites) {
      sprite.position.x -= this.groundSpeed * deltaTime;
      
      // 如果地面移出屏幕，将其放置在另一个地面的右侧
      if (sprite.position.x <= -this.config.width) {
        sprite.position.x = this.config.width;
      }
    }
  }

  public reset(): void {
    this.sprites[0].position.x = 0;
    this.sprites[1].position.x = this.config.width;
    this.groundSpeed = this.config.speed;
  }
} 