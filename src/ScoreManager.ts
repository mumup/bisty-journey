import * as PIXI from 'pixi.js';
import { GameConfig, Score } from './types';

export class ScoreManager implements Score {
  public value: number = 0;
  public highScore: number = 0;
  public text!: PIXI.Text;
  private highScoreText!: PIXI.Text;
  private bonusText!: PIXI.Text;
  private stage: PIXI.Container;
  private config: GameConfig;
  private running: boolean = false;
  private scoreIncrement: number = 0.1; // 每帧增加的分数
  private hiScoreKey: string = 'bisty-high-score';
  private app: PIXI.Application;
  private animateBonusText: (delta: number) => void = () => {};

  constructor(stage: PIXI.Container, config: GameConfig, app: PIXI.Application) {
    this.stage = stage;
    this.config = config;
    this.app = app;
    this.init();
  }

  private init(): void {
    // 从本地存储加载最高分
    this.loadHighScore();
    
    // 创建当前分数文本
    this.text = new PIXI.Text('00000', {
      fontFamily: 'Courier New',
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0x000000
    });
    this.text.position.set(this.config.width - 150, 20);
    this.stage.addChild(this.text);
    
    // 创建最高分文本
    this.highScoreText = new PIXI.Text(`HI ${this.formatScore(this.highScore)}`, {
      fontFamily: 'Courier New',
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0x555555
    });
    this.highScoreText.position.set(this.config.width - 300, 20);
    this.stage.addChild(this.highScoreText);

    // 创建奖励分数文本（初始不可见）
    this.bonusText = new PIXI.Text('+0', {
      fontFamily: 'Courier New',
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0x00CC00
    });
    this.bonusText.visible = false;
    this.stage.addChild(this.bonusText);
  }

  public start(): void {
    this.running = true;
    console.log('计分板已启动');
    
    // 确保初始显示正确
    this.text.text = this.formatScore(this.value);
  }

  public stop(): void {
    this.running = false;
    
    // 更新最高分
    if (this.value > this.highScore) {
      this.highScore = this.value;
      this.saveHighScore();
      this.highScoreText.text = `HI ${this.formatScore(this.highScore)}`;
    }
  }

  public update(deltaTime: number): void {
    if (!this.running) return;
    
    // 更新分数
    this.value += this.scoreIncrement * deltaTime;
    this.text.text = this.formatScore(this.value);
    
    // 每100分增加一次分数增量
    if (Math.floor(this.value) % 100 === 0 && Math.floor(this.value) > 0) {
      this.scoreIncrement *= 1.1;
    }
  }

  public reset(): void {
    // 重置所有计分相关状态
    this.value = 0;
    this.scoreIncrement = 0.1;
    this.text.text = this.formatScore(this.value);
    
    // 重置奖励文本状态
    this.bonusText.visible = false;
    this.bonusText.alpha = 1;
    
    // 移除所有可能存在的动画
    this.app.ticker.remove(this.animateBonusText);
    
    console.log('计分板已重置');
  }

  private formatScore(score: number): string {
    return String(Math.floor(score)).padStart(5, '0');
  }

  private loadHighScore(): void {
    try {
      const savedScore = localStorage.getItem(this.hiScoreKey);
      if (savedScore) {
        this.highScore = parseInt(savedScore);
      }
    } catch (e) {
      console.error('无法加载最高分', e);
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem(this.hiScoreKey, String(Math.floor(this.highScore)));
    } catch (e) {
      console.error('无法保存最高分', e);
    }
  }

  // 新增加的方法，用于添加额外积分
  public addPoints(points: number): void {
    if (!this.running) return;
    
    this.value += points;
    this.text.text = this.formatScore(this.value);
    
    // 显示奖励分数文本动画
    this.showBonusAnimation(points);
  }

  // 显示奖励积分的动画效果
  private showBonusAnimation(points: number): void {
    // 设置文本内容和位置
    this.bonusText.text = `+${points}`;
    this.bonusText.position.set(
      this.text.position.x - 60,
      this.text.position.y
    );
    this.bonusText.alpha = 1;
    this.bonusText.visible = true;
    
    // 移除可能存在的旧动画
    this.app.ticker.remove(this.animateBonusText);
    
    // 重新实现动画函数
    let elapsed = 0;
    this.animateBonusText = (delta: number) => {
      elapsed += delta;
      this.bonusText.alpha = Math.max(0, 1 - elapsed / 30);
      this.bonusText.position.y -= 1;
      
      if (elapsed >= 30) {
        this.bonusText.visible = false;
        this.app.ticker.remove(this.animateBonusText);
      }
    };
    
    // 添加到ticker
    this.app.ticker.add(this.animateBonusText);
  }
} 