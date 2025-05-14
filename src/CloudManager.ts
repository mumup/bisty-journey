import * as PIXI from 'pixi.js';
import { GameConfig } from './types';

export class CloudManager {
  private clouds: PIXI.Sprite[] = [];
  private stage: PIXI.Container;
  private config: GameConfig;
  private resources: any;
  private lastCloudTime: number = 0;
  private cloudSpeed: number;
  private minCloudInterval: number = 3000; // 最短云朵生成间隔(毫秒)
  private maxCloudInterval: number = 6000; // 最长云朵生成间隔(毫秒)
  private nextCloudTime: number = 0;
  private elapsedTime: number = 0;

  constructor(stage: PIXI.Container, config: GameConfig, resources: any) {
    this.stage = stage;
    this.config = config;
    this.resources = resources;
    this.cloudSpeed = config.speed * 0.3; // 云朵移动速度比bisty慢
    this.init();
  }

  private init(): void {
    // 设置初始云朵生成时间
    this.setNextCloudTime();
  }

  public update(deltaTime: number): void {
    // 更新已有云朵位置
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      cloud.position.x -= this.cloudSpeed * deltaTime;
      
      // 如果云朵移出屏幕，则移除
      if (cloud.position.x < -cloud.width) {
        this.stage.removeChild(cloud);
        this.clouds.splice(i, 1);
      }
    }
    
    // 更新时间并检查是否需要生成新云朵
    this.elapsedTime += deltaTime * 16.67; // 转换为毫秒
    if (this.elapsedTime >= this.nextCloudTime) {
      this.createCloud();
      this.setNextCloudTime();
      this.elapsedTime = 0;
    }
  }

  private createCloud(): void {
    const cloudTexture = PIXI.Texture.from('cloud');
    const cloud = new PIXI.Sprite(cloudTexture);
    
    // 设置云朵位置 - 在高度的上半部分随机位置
    const minY = 60;
    const maxY = this.config.groundY - 500;
    cloud.position.set(
      this.config.width + cloud.width,
      minY + Math.random() * (maxY - minY)
    );
    
    // 随机缩放云朵
    const scale = 0.4 + Math.random() * 0.4;
    cloud.scale.set(scale);
    
    this.clouds.push(cloud);
    this.stage.addChild(cloud);
  }

  private setNextCloudTime(): void {
    this.nextCloudTime = this.minCloudInterval + 
      Math.random() * (this.maxCloudInterval - this.minCloudInterval);
  }

  public reset(): void {
    // 清除所有云朵
    for (const cloud of this.clouds) {
      this.stage.removeChild(cloud);
    }
    this.clouds = [];
    this.elapsedTime = 0;
    this.setNextCloudTime();
  }
} 