const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database/db');

// 显示登录页
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/user/home');
  }
  res.render('pages/login', { title: '用户登录' });
});

// 处理登录请求
router.post('/login', async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;
    
    if (!username || !password) {
      return res.json({ success: false, message: '用户名和密码不能为空' });
    }
    
    // 查询用户
    const user = db.get('users', { username });
    
    if (!user) {
      return res.json({ success: false, message: '用户名或密码错误' });
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.json({ success: false, message: '用户名或密码错误' });
    }
    
    // 设置session
    req.session.userId = user.id;
    req.session.username = user.username;
    
    if (rememberMe) {
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    }
    
    res.json({ 
      success: true, 
      message: '登录成功',
      redirectUrl: '/user/home',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.json({ success: false, message: '登录失败，请稍后重试' });
  }
});

// 登出 (POST - API)
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({ success: false, message: '登出失败' });
    }
    res.json({ success: true, message: '已登出' });
  });
});

// 登出 (GET - 直接退出并重定向到首页)
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('登出错误:', err);
    }
    // 清除cookie
    res.clearCookie('connect.sid');
    // 重定向到首页
    res.redirect('/');
  });
});

// 显示注册页
router.get('/register', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/user/home');
  }
  // 注意：需要确保 pages/register 视图文件存在
  res.render('pages/register', { 
    title: '用户注册',
    isAuthenticated: false,
    pageScript: 'register.js'
  }); 
});

// 处理注册请求 (API)
router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword, email, phone } = req.body;
    
    console.log('收到注册请求:', { username, email, phone });
    
    // 收集所有验证错误
    const errors = {};
    
    // 1. 基本字段验证
    if (!username) {
      errors.username = '请输入用户名';
    }
    if (!password) {
      errors.password = '请输入密码';
    }
    if (!confirmPassword) {
      errors.confirmPassword = '请确认密码';
    }
    if (!email) {
      errors.email = '请输入邮箱地址';
    }
    
    // 2. 用户名格式验证
    if (username) {
      if (username.length < 3 || username.length > 20) {
        errors.username = '用户名长度应在3-20个字符之间';
      } else {
        const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
        if (!usernameRegex.test(username)) {
          errors.username = '用户名只能包含字母、数字、下划线和中文';
        }
      }
    }
    
    // 3. 密码格式验证
    if (password) {
      if (password.length < 6 || password.length > 20) {
        errors.password = '密码长度应在6-20个字符之间';
      } else {
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,20}$/;
        if (!passwordRegex.test(password)) {
          errors.password = '密码必须包含至少一个字母和一个数字';
        }
      }
    }
    
    // 4. 确认密码验证
    if (password && confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }
    
    // 5. 邮箱格式验证
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = '请输入正确的邮箱格式';
      }
    }
    
    // 6. 手机号格式验证（如果提供）
    if (phone) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        errors.phone = '请输入正确的手机号码';
      }
    }
    
    // 7. 检查用户名是否已存在
    if (username && !errors.username) {
      const existingUserByUsername = db.get('users', { username });
      if (existingUserByUsername) {
        errors.username = '用户名已存在，请选择其他用户名';
      }
    }
    
    // 8. 检查邮箱是否已存在
    if (email && !errors.email) {
      const existingUserByEmail = db.get('users', { email });
      if (existingUserByEmail) {
        errors.email = '该邮箱已被注册，请使用其他邮箱';
      }
    }
    
    // 9. 检查手机号是否已存在（如果提供）
    if (phone && !errors.phone) {
      const existingUserByPhone = db.get('users', { phone });
      if (existingUserByPhone) {
        errors.phone = '该手机号已被注册，请使用其他手机号';
      }
    }
    
    // 如果有任何验证错误，返回详细的字段错误信息
    if (Object.keys(errors).length > 0) {
      return res.json({ 
        success: false, 
        message: '请检查并修正以下错误',
        errors: errors,
        fieldErrors: true // 标识这是字段级别的错误
      });
    }
    
    // 10. 密码加密
    const hashedPassword = await bcrypt.hash(password, 12); // 使用更高的加密强度
    
    // 11. 创建新用户
    const newUser = {
      username: username.trim(),
      password: hashedPassword,
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      avatar: `https://picsum.photos/100/100?random=${Date.now()}`, // 随机头像
      address: null,
      created_at: new Date().toISOString()
    };

    const createdUser = db.insert('users', newUser);
    
    console.log('用户注册成功:', { id: createdUser.id, username: createdUser.username });
    
    res.json({ 
      success: true, 
      message: '注册成功！请使用用户名和密码登录',
      user: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '注册失败，请稍后重试' 
    });
  }
});

// API: 检查用户名是否可用
router.post('/check-username', (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.json({ success: false, message: '用户名不能为空' });
    }
    
    const existingUser = db.get('users', { username: username.trim() });
    
    if (existingUser) {
      return res.json({ 
        success: false, 
        available: false, 
        message: '用户名已存在' 
      });
    }
    
    res.json({ 
      success: true, 
      available: true, 
      message: '用户名可用' 
    });
    
  } catch (error) {
    console.error('检查用户名错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '检查失败，请稍后重试' 
    });
  }
});

// API: 检查邮箱是否可用
router.post('/check-email', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.json({ success: false, message: '邮箱不能为空' });
    }
    
    const existingUser = db.get('users', { email: email.toLowerCase().trim() });
    
    if (existingUser) {
      return res.json({ 
        success: false, 
        available: false, 
        message: '该邮箱已被注册' 
      });
    }
    
    res.json({ 
      success: true, 
      available: true, 
      message: '邮箱可用' 
    });
    
  } catch (error) {
    console.error('检查邮箱错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '检查失败，请稍后重试' 
    });
  }
});

module.exports = router;

