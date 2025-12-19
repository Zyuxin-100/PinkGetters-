// 用户认证中间件
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    // 用户已登录
    next();
  } else {
    // 未登录，重定向到登录页
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      // AJAX请求返回JSON
      res.status(401).json({ success: false, message: '请先登录' });
    } else {
      // 普通请求重定向
      res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
  }
}

// 可选认证中间件（已登录则设置user，未登录也继续）
function optionalAuth(req, res, next) {
  if (req.session && req.session.userId) {
    req.isAuthenticated = true;
    req.userId = req.session.userId;
  } else {
    req.isAuthenticated = false;
    req.userId = null;
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};

