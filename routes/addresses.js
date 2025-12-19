// routes/addresses.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');

// API: 获取用户地址列表
router.get('/api/addresses', (req, res) => {
    try {
        // 检查用户登录状态
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: '请先登录'
            });
        }
        
        const userId = req.session.userId;
        
        // 获取用户的地址列表
        const addresses = db.all('addresses', { user_id: userId });
        
        // 按创建时间倒序排列，默认地址排在前面
        addresses.sort((a, b) => {
            if (a.is_default && !b.is_default) return -1;
            if (!a.is_default && b.is_default) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        res.json({
            success: true,
            data: addresses
        });
        
    } catch (error) {
        console.error('获取地址列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取地址列表失败'
        });
    }
});

// API: 添加新地址
router.post('/api/addresses', (req, res) => {
    try {
        // 检查用户登录状态
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: '请先登录'
            });
        }
        
        const userId = req.session.userId;
        const { 
            receiverName, 
            receiverPhone, 
            province, 
            city, 
            district, 
            detailAddress, 
            isDefault 
        } = req.body;
        
        // 验证必填字段
        if (!receiverName || !receiverPhone || !province || !city || !district || !detailAddress) {
            return res.status(400).json({
                success: false,
                message: '请填写完整的地址信息'
            });
        }
        
        // 验证手机号格式
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(receiverPhone)) {
            return res.status(400).json({
                success: false,
                message: '请输入正确的手机号码'
            });
        }
        
        // 如果设为默认地址，先取消其他默认地址
        if (isDefault) {
            const existingAddresses = db.all('addresses', { user_id: userId });
            existingAddresses.forEach(addr => {
                if (addr.is_default) {
                    db.update('addresses', addr.id, { is_default: false });
                }
            });
        }
        
        // 创建新地址
        const addressData = {
            user_id: userId,
            receiver_name: receiverName,
            receiver_phone: receiverPhone,
            province: province,
            city: city,
            district: district,
            detail_address: detailAddress,
            is_default: isDefault || false,
            created_at: new Date().toISOString()
        };
        
        const newAddress = db.insert('addresses', addressData);
        
        res.json({
            success: true,
            message: '地址添加成功',
            data: newAddress
        });
        
    } catch (error) {
        console.error('添加地址失败:', error);
        res.status(500).json({
            success: false,
            message: '添加地址失败，请稍后重试'
        });
    }
});

// API: 更新地址
router.put('/api/addresses/:id', (req, res) => {
    try {
        // 检查用户登录状态
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: '请先登录'
            });
        }
        
        const userId = req.session.userId;
        const addressId = parseInt(req.params.id, 10);
        const { 
            receiverName, 
            receiverPhone, 
            province, 
            city, 
            district, 
            detailAddress, 
            isDefault 
        } = req.body;
        
        // 验证地址是否存在且属于当前用户
        const existingAddress = db.get('addresses', { id: addressId, user_id: userId });
        if (!existingAddress) {
            return res.status(404).json({
                success: false,
                message: '地址不存在'
            });
        }
        
        // 验证必填字段
        if (!receiverName || !receiverPhone || !province || !city || !district || !detailAddress) {
            return res.status(400).json({
                success: false,
                message: '请填写完整的地址信息'
            });
        }
        
        // 如果设为默认地址，先取消其他默认地址
        if (isDefault) {
            const existingAddresses = db.all('addresses', { user_id: userId });
            existingAddresses.forEach(addr => {
                if (addr.is_default && addr.id !== addressId) {
                    db.update('addresses', addr.id, { is_default: false });
                }
            });
        }
        
        // 更新地址
        const updateData = {
            receiver_name: receiverName,
            receiver_phone: receiverPhone,
            province: province,
            city: city,
            district: district,
            detail_address: detailAddress,
            is_default: isDefault || false,
            updated_at: new Date().toISOString()
        };
        
        const updatedAddress = db.update('addresses', addressId, updateData);
        
        res.json({
            success: true,
            message: '地址更新成功',
            data: updatedAddress
        });
        
    } catch (error) {
        console.error('更新地址失败:', error);
        res.status(500).json({
            success: false,
            message: '更新地址失败，请稍后重试'
        });
    }
});

// API: 删除地址
router.delete('/api/addresses/:id', (req, res) => {
    try {
        // 检查用户登录状态
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: '请先登录'
            });
        }
        
        const userId = req.session.userId;
        const addressId = parseInt(req.params.id, 10);
        
        // 验证地址是否存在且属于当前用户
        const existingAddress = db.get('addresses', { id: addressId, user_id: userId });
        if (!existingAddress) {
            return res.status(404).json({
                success: false,
                message: '地址不存在'
            });
        }
        
        // 删除地址
        const success = db.delete('addresses', { id: addressId, user_id: userId });
        
        if (success) {
            res.json({
                success: true,
                message: '地址删除成功'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '删除地址失败'
            });
        }
        
    } catch (error) {
        console.error('删除地址失败:', error);
        res.status(500).json({
            success: false,
            message: '删除地址失败，请稍后重试'
        });
    }
});

// API: 设置默认地址
router.put('/api/addresses/:id/default', (req, res) => {
    try {
        // 检查用户登录状态
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: '请先登录'
            });
        }
        
        const userId = req.session.userId;
        const addressId = parseInt(req.params.id, 10);
        
        // 验证地址是否存在且属于当前用户
        const existingAddress = db.get('addresses', { id: addressId, user_id: userId });
        if (!existingAddress) {
            return res.status(404).json({
                success: false,
                message: '地址不存在'
            });
        }
        
        // 取消其他默认地址
        const existingAddresses = db.all('addresses', { user_id: userId });
        existingAddresses.forEach(addr => {
            if (addr.is_default) {
                db.update('addresses', addr.id, { is_default: false });
            }
        });
        
        // 设置为默认地址
        const updatedAddress = db.update('addresses', addressId, { 
            is_default: true,
            updated_at: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: '默认地址设置成功',
            data: updatedAddress
        });
        
    } catch (error) {
        console.error('设置默认地址失败:', error);
        res.status(500).json({
            success: false,
            message: '设置默认地址失败，请稍后重试'
        });
    }
});

module.exports = router;