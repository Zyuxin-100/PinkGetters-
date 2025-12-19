const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const initSampleData = require('./utils/initData');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化示例数据（仅首次运行）
if (process.env.SKIP_INIT !== 'true') {
  initSampleData();
}

// 中间件配置
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: 'shopping-web-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // 开发环境设为false，生产环境使用HTTPS时设为true
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 设置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静态资源目录
app.use(express.static(path.join(__dirname, 'public')));

// 路由配置
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/user'); // 引入新的用户路由
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const shopRoutes = require('./routes/shops');
const addressRoutes = require('./routes/addresses');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/', shopRoutes); // 店铺路由，包含页面和API

app.use('/user/orders', orderRoutes); // 订单页面路由 (must be before /user)
app.use('/api/orders', orderRoutes); // 订单API路由
app.use('/user', userRoutes); // 挂载 /user 前缀
app.use('/', cartRoutes); // 购物车路由，包含页面和API
app.use('/', addressRoutes); // 地址路由，包含API

// 404处理
app.use((req, res) => {
  res.status(404).render('pages/404', { title: '页面未找到' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/500', { title: '服务器错误', error: err });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;

