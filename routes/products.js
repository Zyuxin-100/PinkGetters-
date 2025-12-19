const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取商品列表
router.get('/', (req, res) => {
  try {
    const { 
      category_id, 
      shop_id, 
      featured, 
      sort = 'created_at', 
      order = 'DESC',
      page = 1,
      limit = 20,
      q = ''
    } = req.query;
    
    // 构建查询条件
    let condition = null;
    if (category_id || shop_id) {
      condition = {};
      if (category_id) condition.category_id = parseInt(category_id);
      if (shop_id) condition.shop_id = parseInt(shop_id);
    }
    
    // 获取所有商品
    let products = db.all('products', condition);

    // 关键词过滤
    const keyword = (q || '').toLowerCase();
    if (keyword) {
      products = products.filter(p =>
        (p.name && p.name.toLowerCase().includes(keyword)) ||
        (p.description && p.description.toLowerCase().includes(keyword))||
        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(keyword)))
      );
    }
    
    // 排序
    const validSorts = ['created_at', 'price', 'name'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    products.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (sortOrder === 'DESC') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
    
    // 分页
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const total = products.length;
    products = products.slice(offset, offset + limitNum);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total
      }
    });
  } catch (error) {
    console.error('获取商品列表错误:', error);
    res.json({ success: false, message: '获取商品列表失败' });
  }
});

// 批量获取商品信息
router.get('/batch', (req, res) => {
  try {
    const { ids } = req.query;
    
    if (!ids) {
      return res.json({ success: false, message: '商品ID列表不能为空' });
    }
    
    // 解析商品ID列表
    const productIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (productIds.length === 0) {
      return res.json({ success: false, message: '无效的商品ID列表' });
    }
    
    // 获取商品信息
    const products = productIds.map(id => {
      const product = db.get('products', { id: id });
      if (product) {
        // 获取商品分类信息
        if (product.category_id) {
          const category = db.get('categories', { id: product.category_id });
          product.category = category;
        }
        return product;
      }
      return null;
    }).filter(product => product !== null);
    
    res.json({ 
      success: true, 
      products: products 
    });
  } catch (error) {
    console.error('批量获取商品信息错误:', error);
    res.json({ success: false, message: '获取商品信息失败' });
  }
});

// 获取商品详情
router.get('/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    const product = db.get('products', { id: productId });
    
    if (!product) {
      return res.json({ success: false, message: '商品不存在' });
    }
    
    // 获取商品分类信息
    if (product.category_id) {
      const category = db.get('categories', { id: product.category_id });
      product.category = category;
    }
    
    // 获取店铺信息
    if (product.shop_id) {
      const shop = db.get('shops', { id: product.shop_id });
      product.shop = shop;
    }
    
    // 获取该商品的评价列表（包含简单的用户信息）
    try {
      const reviews = db.all('reviews', { product_id: productId }) || [];
      product.reviews = reviews.map(r => {
        const user = db.get('users', { id: r.user_id }) || {};
        return Object.assign({}, r, {
          user: {
            id: user.id || null,
            username: user.username ? (r.is_anonymous ? '匿名用户' : user.username) : '匿名用户',
            avatar: user.avatar || '/images/avatar-default.png'
          }
        });
      });
    } catch (e) {
      product.reviews = [];
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.json({ success: false, message: '获取商品详情失败' });
  }
});

module.exports = router;

