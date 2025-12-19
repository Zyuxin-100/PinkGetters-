// user_home.js - 用户主页JavaScript

$(document).ready(function() {
    // 1. 加载用户基本信息
    loadUserInfo();
    
    // 2. 订单状态区块点击跳转逻辑 (订单数量现在从服务器端渲染)
    handleOrderStatusClicks();
});

function loadUserInfo() {
    // 假设您有一个API端点来获取登录用户的信息
    ajaxRequest('/api/user/profile', 'GET', null,
        function(response) {
            const user = response.data;
            if (user) {
                $('#user-username').text(`欢迎回来，${user.username}`);
                $('#user-email').text(user.email);
                // 假设user对象中包含avatar_url
                if (user.avatar_url) {
                    $('.avatar').attr('src', user.avatar_url);
                }
            }
        },
        function(message) {
            // 处理加载失败，例如显示默认信息
            console.error('加载用户信息失败:', message);
        }
    );
}

// 订单数量现在从服务器端渲染，不需要单独的API调用

/**
 * 3. 订单状态区块点击跳转逻辑
 * 假设用户主页的状态区块（待支付、待发货、待收货）可以被点击，
 * 并将其父级元素绑定了点击事件。
 * 我们使用计数器的 ID 来确定要跳转的状态。
 */
function handleOrderStatusClicks() {
    // 订单状态区域的链接已经在模板中设置了正确的href，不需要JavaScript处理
    // 这个函数保留以备将来需要添加其他交互逻辑
}