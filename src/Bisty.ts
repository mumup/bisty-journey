import * as PIXI from 'pixi.js';
import { BistyState, GameConfig } from './types';

export class Bisty {
  private sprite!: PIXI.AnimatedSprite;
  private state: BistyState = BistyState.IDLE;
  private velocity: number = 0;
  private runAnimation!: PIXI.Texture[];
  private stage!: PIXI.Container;
  private config!: GameConfig;
  private isJumping: boolean = false;
  private resources: any;

  constructor(stage: PIXI.Container, config: GameConfig, resources: any) {
    this.stage = stage;
    this.config = config;
    this.resources = resources;
    this.init();
  }


  private init(): void {
    // 初始化恐龙精灵
    this.runAnimation = [
      PIXI.Texture.from('bisty-run1'),
      PIXI.Texture.from('bisty-run2')
    ];

    this.sprite = new PIXI.AnimatedSprite(this.runAnimation);
    this.sprite.anchor.set(0.5);
    this.sprite.animationSpeed = 0.1;
    this.sprite.scale.set(0.5);
    this.sprite.position.set(100, this.config.groundY - this.sprite.height / 2);
    
    // 默认显示静止状态
    this.sprite.textures = [PIXI.Texture.from('bisty-idle')];
    this.sprite.gotoAndStop(0);
    
    this.stage.addChild(this.sprite);
  }

  public update(deltaTime: number): void {
    if (this.state === BistyState.JUMPING) {
      // 确保deltaTime不会过大导致跳跃不稳定
      const scaledDelta = Math.min(deltaTime, 1);
      
      // 应用重力，更新速度
      this.velocity += this.config.gravity * scaledDelta;
      
      // 应用速度，更新位置
      this.sprite.y += this.velocity;

      // 检查是否落回地面
      if (this.sprite.y >= this.config.groundY - this.sprite.height / 2) {
        this.sprite.y = this.config.groundY - this.sprite.height / 2;
        this.isJumping = false;
        this.run();
      }
    }
  }

  public jump(): void {
    // 跳跃条件检查
    if (!this.isJumping && this.state !== BistyState.DEAD) {
      // 立即更新状态
      this.state = BistyState.JUMPING;
      this.isJumping = true;
      
      // 设置更强的初始跳跃速度
      this.velocity = this.config.jumpVelocity;
      
      // 切换跳跃动画
      this.sprite.textures = [PIXI.Texture.from('bisty-jump')];
      this.sprite.gotoAndStop(0);
      
      // 直接应用位移，减少首帧延迟感
      // this.sprite.y += this.velocity * 2;
    }
  }

  public run(): void {
    if (this.state !== BistyState.DEAD && !this.isJumping) {
      this.state = BistyState.RUNNING;
      this.sprite.textures = this.runAnimation;
      this.sprite.gotoAndPlay(0);
    }
  }

  public die(): void {
    this.state = BistyState.DEAD;
    this.sprite.textures = [PIXI.Texture.from('bisty-dead')];
    this.sprite.gotoAndStop(0);
  }

  public reset(): void {
    this.state = BistyState.IDLE;
    this.velocity = 0;
    this.isJumping = false;
    this.sprite.textures = [PIXI.Texture.from('bisty-idle')];
    this.sprite.y = this.config.groundY - this.sprite.height / 2;
    this.sprite.gotoAndStop(0);
  }

  public getSprite(): PIXI.Sprite {
    return this.sprite;
  }
} 