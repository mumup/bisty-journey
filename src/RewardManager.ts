import * as PIXI from 'pixi.js';
import { GameConfig, Reward } from './types';

// 单个奖励物品的实现
class RewardItem implements Reward {
  public sprite: PIXI.Sprite;
  public type: 'coin' | 'star' | 'gem';
  public value: number;
  public speed: number;
  public collected: boolean = false;
  private config: GameConfig;
  private floatOffset: number = 0;
  private floatSpeed: number = 0.03;
  private floatAmplitude: number = 0.8;
  private initialY: number = 0;
  private rotationSpeed: number = 0.01;

  constructor(type: 'coin' | 'star' | 'gem', config: GameConfig) {
    this.type = type;
    this.config = config;
    this.speed = config.speed * 0.8;
    
    // 根据类型设置不同的值和纹理
    switch (type) {
      case 'coin':
        this.value = 10;
        this.sprite = PIXI.Sprite.from('coin');
        break;
      case 'star':
        this.value = 20;
        this.sprite = PIXI.Sprite.from('star');
        break;
      case 'gem':
        this.value = 50;
        this.sprite = PIXI.Sprite.from('gem');
        break;
    }
    
    // 设置物品属性
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(0.5);
    
    // 初始位置在屏幕外右侧
    this.reset();
  }

  public update(deltaTime: number): void {
    if (this.collected) return;
    
    // 确保deltaTime在合理范围内
    const safeDelta = Math.min(deltaTime, 2.0);
    
    // 水平移动
    this.sprite.position.x -= this.speed * safeDelta;
    
    // 上下浮动效果 - 使用保存的初始Y位置作为基准
    this.floatOffset += this.floatSpeed * safeDelta;
    this.sprite.position.y = this.initialY + Math.sin(this.floatOffset) * this.floatAmplitude;
    
    // 轻微旋转效果
    // this.sprite.rotation += this.rotationSpeed * safeDelta;
  }

  public checkCollision(dinoSprite: PIXI.Sprite): boolean {
    if (this.collected) return false;
    
    const bisty = {
      x: dinoSprite.x - dinoSprite.width / 2 * 0.6,
      y: dinoSprite.y - dinoSprite.height / 2 * 0.6,
      width: dinoSprite.width * 0.6,
      height: dinoSprite.height * 0.6
    };
    
    const reward = {
      x: this.sprite.x - this.sprite.width / 2 * 0.8,
      y: this.sprite.y - this.sprite.height / 2 * 0.8,
      width: this.sprite.width * 0.8,
      height: this.sprite.height * 0.8
    };
    
    // 检测碰撞
    const collided = !(
      bisty.x + bisty.width < reward.x ||
      bisty.x > reward.x + reward.width ||
      bisty.y + bisty.height < reward.y ||
      bisty.y > reward.y + reward.height
    );
    
    this.collected = collided;
    return collided;
  }

  public reset(): void {
    // 随机高度，确保在恐龙可以跳到的范围内
    const minHeight = this.config.groundY - 170;
    const maxHeight = this.config.groundY - 80;
    
    const posY = minHeight + Math.random() * (maxHeight - minHeight);
    this.sprite.position.set(
      this.config.width + this.sprite.width,
      posY
    );
    
    // 记录初始Y位置用于浮动
    this.initialY = posY;
    
    this.collected = false;
    this.floatOffset = Math.random() * Math.PI * 2; // 随机初始浮动阶段
    this.speed = this.config.speed * (0.7 + Math.random() * 0.3); // 微小的速度变化
  }

  // 显示收集动画
  public playCollectAnimation(onComplete: () => void): void {
    const originalScale = this.sprite.scale.x;
    const originalAlpha = this.sprite.alpha;
    
    // 动画计时
    let elapsed = 0;
    const animate = (delta: number) => {
      elapsed += delta;
      
      if (elapsed < 10) {
        // 物品动画
        this.sprite.scale.set(originalScale + elapsed * 0.05);
        this.sprite.alpha = Math.max(0, originalAlpha - elapsed / 10);
      } else {
        // 重置物品状态
        this.sprite.scale.set(originalScale);
        this.sprite.alpha = originalAlpha;
        
        // 移除动画循环
        if (this.sprite.parent && this.sprite.parent.parent) {
          // 寻找app实例以移除ticker处理函数
          let currentObj: any = this.sprite.parent;
          while (currentObj && !(currentObj instanceof PIXI.Application)) {
            currentObj = currentObj.parent;
          }
          
          if (currentObj && currentObj instanceof PIXI.Application) {
            currentObj.ticker.remove(animate);
          }
        }
        
        onComplete();
      }
    };
    
    // 添加到ticker
    if (this.sprite.parent && this.sprite.parent.parent) {
      // 寻找app实例以添加ticker处理函数
      let currentObj: any = this.sprite.parent;
      while (currentObj && !(currentObj instanceof PIXI.Application)) {
        currentObj = currentObj.parent;
      }
      
      if (currentObj && currentObj instanceof PIXI.Application) {
        currentObj.ticker.add(animate);
      } else {
        // 如果找不到app实例，直接调用完成回调
        onComplete();
      }
    } else {
      // 如果没有有效的parent，直接调用完成回调
      onComplete();
    }
  }
}

export class RewardManager {
  private rewards: RewardItem[] = [];
  private stage: PIXI.Container;
  private config: GameConfig;
  private resources: any;
  private running: boolean = false;
  private elapsedTime: number = 0;
  private nextSpawnTime: number = 2000; // 首次生成时间（毫秒）
  private app: PIXI.Application;
  private rewardContainer: PIXI.Container;
  private onCollectCallback: (value: number) => void;
  private spawnCount: number = 0; // 跟踪已生成的物品数量

  constructor(stage: PIXI.Container, config: GameConfig, resources: any, app: PIXI.Application, onCollectCallback: (value: number) => void) {
    this.stage = stage;
    this.config = config;
    this.resources = resources;
    this.app = app;
    this.onCollectCallback = onCollectCallback;
    
    // 创建一个容器来存放所有奖励物品
    this.rewardContainer = new PIXI.Container();
    this.stage.addChild(this.rewardContainer);
    
    this.init();
  }

  private init(): void {
    // 设置随机的首次生成时间
    this.setNextSpawnTime();
  }

  public start(): void {
    this.running = true;
    console.log('奖励系统已启动');
    
    // 确保所有变量初始化正确
    if (isNaN(this.elapsedTime)) {
      this.elapsedTime = 0;
    }
    
    // 设置新的生成时间间隔
    this.setNextSpawnTime();
    
    // 启动时立即生成一个物品（将倒计时设置为接近完成）
    this.elapsedTime = this.nextSpawnTime * 0.9;
    
    console.log(`奖励系统已启动，将在${(this.nextSpawnTime - this.elapsedTime)/1000}秒后生成第一个物品`);
  }

  public stop(): void {
    this.running = false;
    console.log('奖励系统已停止');
  }

  public update(deltaTime: number): void {
    if (!this.running) return;
    
    // 更新现有奖励物品
    for (let i = this.rewards.length - 1; i >= 0; i--) {
      const reward = this.rewards[i];
      
      // 更新位置
      reward.update(deltaTime);
      
      // 如果物品移出屏幕，将其移除
      if (reward.sprite.position.x < -reward.sprite.width) {
        this.rewardContainer.removeChild(reward.sprite);
        this.rewards.splice(i, 1);
        console.log('奖励物品已移出屏幕并移除');
      }
    }
    
    // 更新时间并检查是否需要生成新物品
    this.elapsedTime += deltaTime * 16.67; // 转换为毫秒
    
    // 保证时间累加正确
    if (isNaN(this.elapsedTime)) {
      console.error('累计时间出现NaN错误，重置为0');
      this.elapsedTime = 0;
    }
    
    if (this.elapsedTime >= this.nextSpawnTime) {
      this.spawnReward();
      this.setNextSpawnTime();
      this.elapsedTime = 0;
    }
  }

  public checkCollisions(dinoSprite: PIXI.Sprite): void {
    for (let i = this.rewards.length - 1; i >= 0; i--) {
      const reward = this.rewards[i];
      
      // 已收集的物品跳过检测
      if (reward.collected) continue;
      
      // 检查是否碰撞
      if (reward.checkCollision(dinoSprite)) {
        // 触发收集回调
        this.onCollectCallback(reward.value);
        
        // 标记为已收集
        reward.collected = true;
        
        // 播放收集动画
        reward.playCollectAnimation(() => {
          // 动画完成后确保物品被移除
          this.removeReward(reward);
        });
      }
    }
  }

  public reset(): void {
    // 先停止运行
    this.running = false;
    
    // 移除所有奖励物品
    for (const reward of this.rewards) {
      try {
        if (reward.sprite.parent) {
          reward.sprite.parent.removeChild(reward.sprite);
        }
        reward.sprite.destroy({children: true, texture: false, baseTexture: false});
      } catch (e) {
        console.error('移除奖励物品时出错:', e);
      }
    }
    this.rewards = [];
    
    // 重置状态
    this.elapsedTime = 0;
    this.spawnCount = 0;
    
    // 设置新的生成时间
    this.setNextSpawnTime();
    
    console.log('奖励系统已重置');
  }

  private spawnReward(): void {
    // 增加计数
    this.spawnCount++;
    
    // 随机选择奖励类型
    const rand = Math.random();
    let type: 'coin' | 'star' | 'gem';
    
    if (rand < 0.6) {
      type = 'coin'; // 60%的概率生成金币
    } else if (rand < 0.9) {
      type = 'star'; // 30%的概率生成星星
    } else {
      type = 'gem';  // 10%的概率生成宝石
    }
    
    // 创建奖励物品
    const reward = new RewardItem(type, this.config);
    this.rewards.push(reward);
    
    // 添加到容器
    this.rewardContainer.addChild(reward.sprite);
    
    console.log(`已生成第${this.spawnCount}个奖励物品(${type})，当前共有${this.rewards.length}个奖励在场景中`);
  }

  private setNextSpawnTime(): void {
    // 设置下一次生成的时间间隔 - 减少间隔确保更频繁生成
    const minTime = 2000; // 最小间隔2秒
    const maxTime = 6000; // 最大间隔6秒
    
    this.nextSpawnTime = minTime + Math.random() * (maxTime - minTime);
    
    // 调试输出
    console.log(`下一个奖励物品将在 ${this.nextSpawnTime/1000} 秒后生成`);
  }

  // 安全地移除奖励物品
  private removeReward(reward: RewardItem): void {
    // 检查物品是否仍在数组中
    const index = this.rewards.indexOf(reward);
    if (index !== -1) {
      try {
        // 从容器中移除
        if (reward.sprite.parent) {
          reward.sprite.parent.removeChild(reward.sprite);
        }
        
        // 销毁精灵资源
        reward.sprite.destroy({children: true, texture: false, baseTexture: false});
        
        // 从数组中移除
        this.rewards.splice(index, 1);
        
        console.log(`成功移除奖励物品，剩余：${this.rewards.length}`);
      } catch (e) {
        console.error('移除奖励物品时出错:', e);
      }
    }
  }

  // 添加一个公共方法来获取调试信息
  public getDebugInfo(): string {
    return `运行状态:${this.running}, 累计时间:${Math.floor(this.elapsedTime)}ms, 下次生成:${Math.floor(this.nextSpawnTime)}ms, 当前物品数:${this.rewards.length}, 总生成数:${this.spawnCount}`;
  }
} 