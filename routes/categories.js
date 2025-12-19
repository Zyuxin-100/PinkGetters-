const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 获取分类列表
router.get('/', (req, res) => {
  try {
    let categories = db.all('categories');
    // 按ID排序
    categories.sort((a, b) => a.id - b.id);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取分类列表错误:', error);
    res.json({ success: false, message: '获取分类列表失败' });
  }
});

module.exports = router;

