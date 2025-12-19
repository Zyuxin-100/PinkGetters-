const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const db = require('../database/db');

// 搜索结果页
router.get('/search', optionalAuth, (req, res) => {
  const { type = 'product', q = '' } = req.query;
  res.render('pages/search', {
    title: '搜索',
    isAuthenticated: req.isAuthenticated,
    searchType: type === 'shop' ? 'shop' : 'product',
    searchKeyword: q || '',
    pageScript: 'search.js'
  });
});

// 网站主页
router.get('/', optionalAuth, (req, res) => {
  res.render('pages/index', {
    title: '首页',
    isAuthenticated: req.isAuthenticated,
    pageScript: 'index.js'
  });
});

// 分类列表页
router.get('/categories', optionalAuth, (req, res) => {
  res.render('pages/categories', {
    title: '全部分类',
    isAuthenticated: req.isAuthenticated,
    pageScript: 'categories.js'
  });
});

// 分类详情页
router.get('/category/:id', optionalAuth, (req, res) => {
  const categoryId = parseInt(req.params.id, 10);
  const category = db.get('categories', { id: categoryId });

  if (!category) {
    return res.status(404).render('pages/404', { title: '分类不存在', isAuthenticated: req.isAuthenticated });
  }

  res.render('pages/category', {
    title: `${category.name} - 分类`,
    isAuthenticated: req.isAuthenticated,
    category,
    pageScript: 'category.js'
  });
});

// 商品详情页
router.get('/product/:id', optionalAuth, (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const product = db.get('products', { id: productId });

  if (!product) {
    return res.status(404).render('pages/404', { title: '商品不存在', isAuthenticated: req.isAuthenticated });
  }

  res.render('pages/product', {
    title: `${product.name} - 商品详情`,
    isAuthenticated: req.isAuthenticated,
    productId: productId,
    pageScript: 'product.js'
  });
});

// 订单确认页面
router.get('/checkout', optionalAuth, (req, res) => {
  // 检查用户是否已登录
  if (!req.isAuthenticated) {
    return res.redirect('/auth/login?redirect=/checkout');
  }

  try {
    const userId = req.session.userId; // 使用session中的userId
    
    console.log('Checkout页面 - 用户ID:', userId);
    console.log('Session信息:', req.session);
    
    if (!userId) {
      console.error('用户ID不存在，重定向到登录页');
      return res.redirect('/auth/login?redirect=/checkout');
    }
    
    // 获取用户地址列表
    let addresses = [];
    try {
      addresses = db.all('addresses', { user_id: userId });
      console.log('查询到的地址数量:', addresses.length);
      
      // 按创建时间倒序排列，默认地址排在前面
      addresses.sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } catch (dbError) {
      console.error('数据库查询地址失败:', dbError);
      addresses = []; // 使用空数组作为后备
    }
    
    console.log('渲染checkout页面，地址数量:', addresses.length);

    res.render('pages/checkout', {
      title: '确认订单',
      isAuthenticated: req.isAuthenticated,
      addresses: addresses,
      pageScript: 'checkout.js'
    });
  } catch (error) {
    console.error('Checkout页面错误:', error);
    res.status(500).render('pages/500', {
      title: '服务器错误',
      isAuthenticated: req.isAuthenticated,
      error: error
    });
  }
});

module.exports = router;

