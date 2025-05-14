# bisty游戏

这是一个使用PixiJS实现的bisty游戏。

## 功能特性

- bisty跑动和跳跃动画
- 随机生成仙人掌和鸟类障碍物
- 根据游戏进程逐渐增加难度
- 计分系统和最高分记录
- 装饰性云朵背景元素

## 如何运行

1. 安装依赖:

```
npm install
```

2. 启动开发服务器:

```
npm start
```

3. 在浏览器中访问 `http://localhost:8080`

## 游戏操作

- 按空格键开始游戏
- 按空格键让bisty跳跃
- 游戏结束后按空格键重新开始

## 项目结构

- `src/DinoGame.ts` - 游戏主类
- `src/Bisty.ts` - bisty角色类
- `src/ObstacleManager.ts` - 障碍物管理
- `src/Ground.ts` - 地面滚动效果
- `src/CloudManager.ts` - 云朵背景
- `src/ScoreManager.ts` - 分数管理
- `src/types.ts` - 类型定义

## 构建生产版本

```
npm run build
```

生成的文件将在 `dist` 目录中。 