import * as PIXI from 'pixi.js';
import { GameState, BistyState, GameConfig } from './types';
import { Bisty } from './Bisty';
import { ObstacleManager } from './ObstacleManager';
import { Ground } from './Ground';
import { ScoreManager } from './ScoreManager';
import { CloudManager } from './CloudManager';
import { RewardManager } from './RewardManager';

export class BistyGame {
  private app: PIXI.Application;
  private gameContainer: HTMLElement;
  private gameState: GameState = GameState.WAITING;
  private bisty!: Bisty;
  private ground!: Ground;
  private obstacleManager!: ObstacleManager;
  private scoreManager!: ScoreManager;
  private cloudManager!: CloudManager;
  private rewardManager!: RewardManager;
  private config: GameConfig;
  private gameOverText!: PIXI.Text;
  private startText!: PIXI.Text;
  private resources!: any;
  private background!: PIXI.Sprite;
  private bgMusic!: HTMLAudioElement;
  private musicButton!: PIXI.Container;
  private isMusicPlaying: boolean = false;
  private debugMode: boolean = false;
  private debugText!: PIXI.Text;
  private gameOverModal!: PIXI.Container;
  private restartButton!: PIXI.Container;
  private tweetButton!: PIXI.Container;

  constructor(containerId: string) {
    this.gameContainer = document.getElementById(containerId) as HTMLElement;
    this.config = {
      width: 1000,
      height: 600,
      gravity: 0.8,
      jumpVelocity: -15,
      speed: 5,
      speedIncrement: 0.001,
      obstacleInterval: 1500,
      groundY: 550
    };

    this.app = new PIXI.Application({
      width: this.config.width,
      height: this.config.height,
      backgroundColor: 0xFFFFFF,
      antialias: true
    });

    // 限制最高为60fps
    this.app.ticker.maxFPS = 60

    this.gameContainer.appendChild(this.app.view as unknown as Node);
    
    // 设置音频上下文自动播放策略
    this.setupAudioContext();
    
    this.init();
  }

  private async init(): Promise<void> {
    // 加载资源
    await this.loadAssets();
    
    // 创建游戏对象
    this.createGameObjects();

    // 设置键盘事件
    this.setupKeyboardEvents();

    // 启动游戏循环
    this.app.ticker.add(this.gameLoop.bind(this));
    
    // 显示开始提示
    this.showStartMessage();
  }

  private async loadAssets(): Promise<void> {
    PIXI.Assets.add({ alias: 'ground', src: 'assets/ground.png' })
    PIXI.Assets.add({ alias: 'cactus-small', src: 'assets/cactus-small.png' })
    PIXI.Assets.add({ alias: 'cactus-large', src: 'assets/cactus-large.png' })
    PIXI.Assets.add({ alias: 'background', src: 'assets/background.jpg' })
    PIXI.Assets.add({ alias: 'bird1', src: 'assets/bird1.png' })
    PIXI.Assets.add({ alias: 'bird2', src: 'assets/bird2.png' })

    PIXI.Assets.add({ alias: 'cloud', src: 'assets/cloud.png' })

    // 添加奖励物品资源
    PIXI.Assets.add({ alias: 'coin', src: 'assets/coin.png' })
    PIXI.Assets.add({ alias: 'star', src: 'assets/star.png' })
    PIXI.Assets.add({ alias: 'gem', src: 'assets/gem.png' })

    // PIXI.Assets.add({ alias: 'bisty-run1', src: 'assets/bisty-run1.svg' })
    // PIXI.Assets.add({ alias: 'bisty-run2', src: 'assets/bisty-run2.svg' })

    // 加载背景音乐
    this.bgMusic = new Audio('assets/sounds/bgm.mp3');
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.5;

    return new Promise((resolve) => {
      PIXI.Assets.load([
        'assets/bisty.json',
        'ground',
        'cactus-small',
        'cactus-large',
        'bird1',
        'bird2',
        'background',
        'cloud',
        'coin',
        'star',
        'gem',
        // 'bisty-run1',
        // 'bisty-run2'
      ]).then((resources) => {
        this.resources = resources as any;
        resolve();
      });
    });
  }

  private createGameObjects(): void {
    // 创建背景
    this.createBackground();
    
    // 创建地面
    this.ground = new Ground(this.app.stage, this.config, this.resources);
    
    // 创建bisty
    this.bisty = new Bisty(this.app.stage, this.config, this.resources);
    
    // 创建障碍物管理器
    this.obstacleManager = new ObstacleManager(this.app.stage, this.config, this.resources);
    
    // 创建分数管理器
    this.scoreManager = new ScoreManager(this.app.stage, this.config, this.app);

    // 创建云管理器
    this.cloudManager = new CloudManager(this.app.stage, this.config, this.resources);

    // 创建奖励物品管理器
    this.rewardManager = new RewardManager(
      this.app.stage, 
      this.config, 
      this.resources, 
      this.app,
      (points) => this.scoreManager.addPoints(points)
    );
    
    // 创建音乐控制按钮
    this.createMusicButton();

    // 创建游戏结束文本（用作备用）
    this.gameOverText = new PIXI.Text('GAME OVER - press Enter to restart', {
      fontFamily: 'Arial',
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#fff'
    });
    this.gameOverText.anchor.set(0.5);
    this.gameOverText.position.set(this.config.width / 2, this.config.height / 2);
    this.gameOverText.visible = false;
    this.app.stage.addChild(this.gameOverText);

    // 创建开始游戏文本
    this.startText = new PIXI.Text('press space to start', {
      fontFamily: 'Arial',
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#fff'
    });
    this.startText.anchor.set(0.5);
    this.startText.position.set(this.config.width / 2, this.config.height / 2);
    this.app.stage.addChild(this.startText);
    
    // 创建调试文本（默认不显示）
    this.debugText = new PIXI.Text('DEBUG', {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: 0xFF0000
    });
    this.debugText.position.set(10, 10);
    this.debugText.visible = this.debugMode;
    this.app.stage.addChild(this.debugText);

    // 创建游戏结束弹框
    this.createGameOverModal();
  }

  private createBackground(): void {
    // 创建背景精灵
    this.background = PIXI.Sprite.from('background');
    
    // 设置背景尺寸和位置
    this.background.width = this.config.width;
    this.background.height = this.config.height;
    this.background.position.set(0, 0);
    
    // 确保背景在最下层
    this.app.stage.addChildAt(this.background, 0);
  }

  private setupKeyboardEvents(): void {
    // 记录按键状态
    const keyState: Record<string, boolean> = {};
    
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // 添加调试模式切换
      if (e.code === 'KeyD' && e.altKey) {
        this.debugMode = !this.debugMode;
        this.debugText.visible = this.debugMode;
        console.log(`调试模式: ${this.debugMode ? '开启' : '关闭'}`);
        e.preventDefault();
        return;
      }
      
      // 处理回车键 - 用于重启游戏
      if (e.code === 'Enter' || e.key === 'Enter') {
        if (!keyState['Enter']) {
          keyState['Enter'] = true;
          
          if (this.gameState === GameState.OVER) {
            // 如果弹框显示，按回车键重启游戏
            if (this.gameOverModal.visible) {
              this.hideGameOverModal();
            }
            this.restartGame();
          }
        }
        e.preventDefault();
      }
      
      // 处理空格键 - 用于开始游戏和跳跃
      if (e.code === 'Space' || e.key === ' ') {
        // 避免按住空格键重复触发
        if (!keyState['Space']) {
          keyState['Space'] = true;
          
          if (this.gameState === GameState.WAITING) {
            this.startGame();
          } else if (this.gameState === GameState.RUNNING) {
            // 直接执行跳跃
            this.bisty.jump();
          }
        }
        e.preventDefault();
      }
    });
    
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        keyState['Space'] = false;
        e.preventDefault();
      }
      if (e.code === 'Enter' || e.key === 'Enter') {
        keyState['Enter'] = false;
        e.preventDefault();
      }
    });
  }

  private gameLoop(deltaTime: number): void {
    try {
      // 更新调试信息
      if (this.debugMode) {
        this.updateDebugInfo();
      }
      
      if (this.gameState !== GameState.RUNNING) return;

      // 限制deltaTime，确保游戏稳定性
      const cappedDelta = Math.min(deltaTime, 1.5);
      
      try {
        // 先更新bisty - 确保跳跃优先处理
        this.bisty.update(cappedDelta);
      } catch (e) {
        console.error('更新bisty时出错:', e);
      }
      
      try {
        // 更新其他游戏对象
        this.ground.update(cappedDelta);
      } catch (e) {
        console.error('更新地面时出错:', e);
      }
      
      try {
        this.obstacleManager.update(cappedDelta);
      } catch (e) {
        console.error('更新障碍物时出错:', e);
      }
      
      try {
        this.cloudManager.update(cappedDelta);
      } catch (e) {
        console.error('更新云层时出错:', e);
      }
      
      try {
        this.scoreManager.update(cappedDelta);
      } catch (e) {
        console.error('更新分数时出错:', e);
      }
      
      try {
        this.rewardManager.update(cappedDelta);
      } catch (e) {
        console.error('更新奖励系统时出错:', e);
      }
      
      try {
        // 碰撞检测 - 障碍物
        if (this.obstacleManager.checkCollisions(this.bisty.getSprite())) {
          this.gameOver();
          return;
        }
      } catch (e) {
        console.error('检测障碍物碰撞时出错:', e);
      }
      
      try {
        // 碰撞检测 - 奖励物品
        this.rewardManager.checkCollisions(this.bisty.getSprite());
      } catch (e) {
        console.error('检测奖励物品碰撞时出错:', e);
      }
    } catch (e) {
      console.error('游戏主循环出错:', e);
    }
  }

  private createMusicButton(): void {
    // 创建音乐按钮容器
    this.musicButton = new PIXI.Container();
    this.musicButton.position.set(this.config.width - 50, 50);
    this.musicButton.eventMode = 'static';
    this.musicButton.cursor = 'pointer';
    
    // 创建按钮背景
    const buttonBg = new PIXI.Graphics();
    buttonBg.beginFill(0x000000, 0.7);
    buttonBg.drawRoundedRect(-20, -20, 40, 40, 8);
    buttonBg.endFill();
    
    // 创建音乐图标 (音乐关闭状态)
    const musicIcon = new PIXI.Graphics();
    this.drawMusicIcon(musicIcon, false);
    
    // 添加到容器
    this.musicButton.addChild(buttonBg);
    this.musicButton.addChild(musicIcon);
    
    // 添加点击事件
    this.musicButton.on('pointerdown', this.toggleMusic.bind(this));
    
    // 添加悬停效果
    this.musicButton.on('pointerover', () => {
      buttonBg.tint = 0x999999;
    });
    
    this.musicButton.on('pointerout', () => {
      buttonBg.tint = 0xFFFFFF;
    });
    
    // 添加到舞台
    this.app.stage.addChild(this.musicButton);
  }

  private drawMusicIcon(graphics: PIXI.Graphics, isPlaying: boolean): void {
    graphics.clear();
    
    if (isPlaying) {
      // 播放状态 - 音符图标
      graphics.lineStyle(2, 0xFFFFFF);
      graphics.beginFill(0xFFFFFF);
      
      // 画一个音符
      graphics.drawCircle(-5, 5, 6);
      graphics.endFill();
      
      graphics.lineStyle(3, 0xFFFFFF);
      graphics.moveTo(1, -10);
      graphics.lineTo(1, 5);
      graphics.moveTo(-5, 5);
      graphics.lineTo(1, 5);
    } else {
      // 静音状态 - 带斜线的扬声器图标
      graphics.lineStyle(0);
      graphics.beginFill(0xFFFFFF);
      
      // 画扬声器
      graphics.drawRoundedRect(-10, -8, 8, 16, 2);
      graphics.drawPolygon([
        -2, -8,
        8, -15,
        8, 15,
        -2, 8
      ]);
      graphics.endFill();
      
      // 添加斜线
      graphics.lineStyle(3, 0xFF0000);
      graphics.moveTo(-12, -12);
      graphics.lineTo(12, 12);
    }
  }

  private updateMusicIcon(isPlaying: boolean): void {
    // 清除旧图标
    while (this.musicButton.children.length > 1) {
      this.musicButton.removeChildAt(1);
    }
    
    // 创建新图标
    const musicIcon = new PIXI.Graphics();
    this.drawMusicIcon(musicIcon, isPlaying);
    this.musicButton.addChild(musicIcon);
  }

  private toggleMusic(): void {
    if (this.isMusicPlaying) {
      // 暂停音乐
      this.bgMusic.pause();
      
      // 更新图标为静音状态
      this.updateMusicIcon(false);
    } else {
      // 播放音乐
      this.bgMusic.play();
      
      // 更新图标为播放状态
      this.updateMusicIcon(true);
    }
    
    this.isMusicPlaying = !this.isMusicPlaying;
  }

  private startGame(): void {
    this.gameState = GameState.RUNNING;
    this.startText.visible = false;
    this.bisty.run();
    this.obstacleManager.start();
    this.scoreManager.start();
    this.rewardManager.start();
    
    // 开始播放背景音乐
    if (!this.isMusicPlaying) {
      this.toggleMusic();
    }
  }

  private createGameOverModal(): void {
    // 创建弹框容器
    this.gameOverModal = new PIXI.Container();
    this.gameOverModal.position.set(this.config.width / 2, this.config.height / 2);
    this.gameOverModal.visible = false;
    
    // 创建半透明背景
    const modalBg = new PIXI.Graphics();
    modalBg.beginFill(0x000000, 0.7);
    modalBg.drawRoundedRect(-200, -150, 400, 300, 16);
    modalBg.endFill();
    
    // 创建标题
    const titleText = new PIXI.Text('GAME OVER', {
      fontFamily: 'Arial',
      fontSize: 36,
      fontWeight: 'bold',
      fill: 0xFFFFFF
    });
    titleText.anchor.set(0.5);
    titleText.position.set(0, -100);
    
    // 添加分数显示
    const scoreText = new PIXI.Text('Score: 0', {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xFFFFFF
    });
    scoreText.anchor.set(0.5);
    scoreText.position.set(0, -40);
    
    // 创建重新开始按钮
    this.restartButton = this.createButton('RESTART', 0x38B673, 0x2D8C5A, -80);
    
    // 创建分享到推特按钮
    this.tweetButton = this.createButton('SHARE ON X', 0x1D9BF0, 0x1876B4, 80);
    
    // 添加到弹框
    this.gameOverModal.addChild(modalBg);
    this.gameOverModal.addChild(titleText);
    this.gameOverModal.addChild(scoreText);
    this.gameOverModal.addChild(this.restartButton);
    this.gameOverModal.addChild(this.tweetButton);
    
    // 添加到舞台
    this.app.stage.addChild(this.gameOverModal);
    
    // 设置事件处理
    this.restartButton.eventMode = 'static';
    this.restartButton.cursor = 'pointer';
    this.restartButton.on('pointerdown', () => {
      this.hideGameOverModal();
      this.restartGame();
    });
    
    this.tweetButton.eventMode = 'static';
    this.tweetButton.cursor = 'pointer';
    this.tweetButton.on('pointerdown', () => {
      this.shareOnTwitter();
    });
  }

  private createButton(text: string, color: number, hoverColor: number, xOffset: number): PIXI.Container {
    const button = new PIXI.Container();
    
    // 创建按钮背景
    const buttonBg = new PIXI.Graphics();
    buttonBg.beginFill(color);
    buttonBg.drawRoundedRect(-70, -20, 140, 40, 8);
    buttonBg.endFill();
    
    // 创建按钮文本
    const buttonText = new PIXI.Text(text, {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xFFFFFF
    });
    buttonText.anchor.set(0.5);
    
    // 添加到按钮容器
    button.addChild(buttonBg);
    button.addChild(buttonText);
    button.position.set(xOffset, 40);
    
    // 添加交互效果
    button.eventMode = 'static';
    button.cursor = 'pointer';
    
    button.on('pointerover', () => {
      buttonBg.tint = hoverColor;
    });
    
    button.on('pointerout', () => {
      buttonBg.tint = 0xFFFFFF;
    });
    
    return button;
  }

  private showGameOverModal(): void {
    // 更新分数显示
    const scoreText = this.gameOverModal.children[2] as PIXI.Text;
    scoreText.text = `Score: ${Math.floor(this.scoreManager.value)}`;
    
    // 显示弹框
    this.gameOverModal.visible = true;
    this.gameOverText.visible = false;
  }

  private hideGameOverModal(): void {
    this.gameOverModal.visible = false;
  }

  private shareOnTwitter(): void {
    const score = Math.floor(this.scoreManager.value);
    const tweetText = encodeURIComponent(`MAY 19 = SIWA Testnet! 🌵 The Sahara awaits—be part of the next big thing in blockchain. Who's in? @SaharaLabsAI  #SIWATestnet `);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    
    // 在新窗口中打开分享链接
    window.open(tweetUrl, '_blank');
  }

  private gameOver(): void {
    this.gameState = GameState.OVER;
    this.bisty.die();
    this.obstacleManager.stop();
    this.scoreManager.stop();
    this.rewardManager.stop();
    
    // 显示游戏结束弹框，而非文本
    this.showGameOverModal();
    
    // 游戏结束时低音量播放音乐
    if (this.isMusicPlaying) {
      this.bgMusic.volume = 0.2;
    }
  }

  private restartGame(): void {
    // 先更改游戏状态
    this.gameState = GameState.RUNNING;
    this.gameOverText.visible = false;
    
    // 重置各个组件
    this.bisty.reset();
    this.obstacleManager.reset();
    this.scoreManager.reset();
    this.rewardManager.reset();
    
    // 启动各个系统
    this.bisty.run();
    this.obstacleManager.start();
    this.scoreManager.start();
    this.rewardManager.start();
    
    // 输出调试信息
    console.log('游戏已重新启动');
    console.log('计分板状态:', this.scoreManager.value);
    console.log('奖励系统状态:', this.rewardManager.getDebugInfo());
    
    // 恢复音乐音量
    if (this.isMusicPlaying) {
      this.bgMusic.volume = 0.5;
    } else {
      // 如果音乐未播放，开始播放
      this.toggleMusic();
    }
  }

  private showStartMessage(): void {
    this.startText.visible = true;
  }

  private setupAudioContext(): void {
    // 处理浏览器对音频自动播放的限制
    document.addEventListener('click', () => {
      if (this.bgMusic && this.bgMusic.paused) {
        // 用户交互后尝试预加载音频
        const silentPlay = () => {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          context.resume().then(() => {
            if (this.isMusicPlaying) {
              this.bgMusic.play().catch(() => {});
            }
          });
        };
        
        silentPlay();
      }
    }, { once: true });
  }

  private updateDebugInfo(): void {
    if (!this.debugText) return;
    
    const rewardInfo = this.rewardManager.getDebugInfo();
    this.debugText.text = `FPS: ${Math.round(this.app.ticker.FPS)}\n${rewardInfo}`;
  }
} 