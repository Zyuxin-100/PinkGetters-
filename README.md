# PinkGetters 购物网站项目

这是一个基于 Node.js 和 Express 的 PinkGetters 购物网站课程项目，实现了电商平台的基本功能。

![项目截图](public/images/screenshot.png)

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [安装与运行](#安装与运行)
- [功能页面](#功能页面)
- [API 接口](#api-接口)
- [数据库设计](#数据库设计)
- [开发规范](#开发规范)
- [注意事项](#注意事项)
- [贡献者](#贡献者)

## 功能特性

- 用户注册与登录系统
- 商品浏览与搜索功能
- 购物车管理
- 订单管理系统
- 商品分类展示
- 店铺展示页面
- 用户个人中心
- 收货地址管理

## 技术栈

### 后端技术
- **Node.js** - JavaScript 运行时环境
- **Express.js** - Web 应用框架
- **EJS** - 模板引擎
- **SQLite** - 轻量级关系型数据库

### 前端技术
- **HTML5/CSS3** - 页面结构与样式
- **Bootstrap 5** - CSS 框架
- **JavaScript/jQuery** - 前端交互逻辑

### 安全与工具
- **bcrypt** - 密码加密
- **express-session** - 会话管理
- **nodemon** - 开发环境热重载

## 项目结构

```
shopping_web/
├── database/           # 数据库相关文件
│   ├── data/           # 数据文件
│   └── db.js           # 数据库操作封装
├── middleware/         # 中间件
├── public/             # 静态资源文件
│   ├── css/            # 样式文件
│   ├── images/         # 图片资源
│   └── js/             # JavaScript 文件
├── routes/             # 路由处理
├── utils/              # 工具函数
├── views/              # 视图模板
│   ├── pages/          # 页面模板
│   └── partials/       # 公共模板片段
├── app.js              # 应用入口文件
├── package.json        # 项目配置文件
└── README.md           # 项目说明文档
```

## 安装与运行

### 环境要求
- Node.js >= v14
- npm >= 6.0

### 安装步骤

1. 克隆项目到本地：
```bash
git clone <repository-url>
cd shopping_web
```

2. 安装依赖：
```bash
npm install
```

3. 启动项目：
```bash
# 生产环境
npm start

# 开发环境（带热重载）
npm run dev
```

4. 访问应用：
打开浏览器访问 http://localhost:3000

## 功能页面

| 页面 | URL | 描述 |
|------|-----|------|
| 首页 | `/` | 展示推荐商品和分类入口 |
| 登录页 | `/login` | 用户登录界面 |
| 注册页 | `/register` | 用户注册界面 |
| 用户主页 | `/user/home` | 显示用户个人信息 |
| 商品分类页 | `/categories` | 按类别展示商品列表 |
| 商品详情页 | `/product/:id` | 查看具体商品信息 |
| 店铺主页 | `/shop/:id` | 店铺展示页面 |
| 购物车页 | `/cart` | 管理用户选中商品 |
| 结算页 | `/checkout` | 订单结算页面 |
| 订单列表页 | `/user/orders` | 查看历史订单 |

## API 接口

### 用户认证
- `POST /auth/login` - 用户登录
- `POST /auth/logout` - 用户登出
- `GET /auth/status` - 获取登录状态

### 商品相关
- `GET /api/products` - 获取商品列表
- `GET /api/products/:id` - 获取商品详情
- `GET /api/categories` - 获取分类列表

### 购物车相关
- `GET /api/cart` - 获取购物车列表
- `POST /api/cart/add` - 添加商品到购物车
- `POST /api/cart/remove` - 从购物车移除商品
- `POST /api/cart/update` - 更新购物车商品数量

### 订单相关
- `GET /api/orders` - 获取订单列表
- `POST /api/orders/create` - 创建订单
- `POST /api/orders/:id/cancel` - 取消订单

### 地址相关
- `GET /api/addresses` - 获取地址列表
- `POST /api/addresses` - 添加新地址
- `PUT /api/addresses/:id` - 更新地址
- `DELETE /api/addresses/:id` - 删除地址

## 数据库设计

项目使用 SQLite 数据库存储数据，包含以下主要表：

- `users` - 用户表
- `categories` - 商品分类表
- `shops` - 店铺表
- `products` - 商品表
- `cart_items` - 购物车项表
- `orders` - 订单表
- `order_items` - 订单项表
- `addresses` - 地址表
- `reviews` - 商品评价表

数据库文件会自动创建在 `database/data/database.json`。


## 注意事项

1. 数据库文件会自动创建在 `database/data/database.json`
2. 默认端口: 3000
3. 开发环境请确保已安装 Node.js (建议 v14+)
4. 初始测试账号: admin / 123456
5. 项目仅供学习使用，请勿用于生产环境

## 贡献者

- 项目开发者

## 许可证

本项目仅供学习交流使用。