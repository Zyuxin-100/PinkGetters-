const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../database/db');

// 用户主页路由
router.get('/home', requireAuth, (req, res) => {
  console.log('用户主页访问 - Session调试:', {
    hasSession: !!req.session,
    userId: req.session?.userId,
    username: req.session?.username,
    sessionId: req.session?.id
  });
  
  // 获取用户信息
  const user = db.get('users', { id: req.session.userId });
  
  if (!user) {
    req.session.destroy();
    return res.redirect('/auth/login');
  }

  // 获取用户订单并按状态统计
  const userOrders = db.all('orders', { user_id: req.session.userId });
  const orderCounts = {
    pending_payment: 0,
    pending_shipment: 0,
    shipped: 0,
    completed: 0,
    pending_review: 0
  };

  userOrders.forEach(order => {
    switch(order.status) {
      case 'pending_payment':
        orderCounts.pending_payment++;
        break;
      case 'pending_shipment':
        orderCounts.pending_shipment++;
        break;
      case 'shipped':
        orderCounts.shipped++;
        break;
      case 'completed':
        orderCounts.completed++;
        orderCounts.pending_review++;// 已完成的订单可以评价
        break;
    }
  });

  // 渲染用户主页视图
  res.render('pages/user_home', { 
    title: '个人中心',
    isAuthenticated: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar
    },
    orderCounts: orderCounts
  });
});

module.exports = router;