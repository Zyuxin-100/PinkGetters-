// order_list.js - 用户订单页面JavaScript逻辑

$(document).ready(function() {

    // --- 0. 页面初始化 - 根据URL参数进行筛选 ---
    
    /**
     * 从URL中获取指定名称的查询参数。
     */
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }
    
    const initialStatus = getUrlParameter('status');
    if (initialStatus) {
        // 1. 移除所有激活样式
        $('.order-filter-card a').removeClass('active');
        
        // 2. 激活对应筛选链接的样式
        const $link = $(`.order-filter-card a[data-status="${initialStatus}"]`);
        if ($link.length) {
            $link.addClass('active');
        }

        // 3. 执行筛选（注意：如果后端加载订单，应改为 loadOrders(initialStatus);）
        filterOrders(initialStatus);
    }
    
    // 页面加载时执行的初始化逻辑 (如果需要从后端加载订单)
    // loadOrders('all'); 
    
    // --- 1. 订单操作事件绑定 ---

    // 使用事件委托处理所有订单操作按钮的点击
    $(document).on('click', '.order-actions button', function() {
        const $button = $(this);
        const action = $button.data('action');
        const $orderCard = $button.closest('.order-card');
        const orderId = $orderCard.data('order-id');
        
        if (!orderId) {
            showAlert('danger', '无法识别订单ID！');
            return;
        }

        switch (action) {
            case 'pay':
                handlePay(orderId, $orderCard);
                break;
            case 'cancel':
                handleCancel(orderId, $orderCard);
                break;
            case 'confirm-receipt':
                handleConfirmReceipt(orderId, $orderCard);
                break;
            case 'delete':
                handleDelete(orderId, $orderCard);
                break;
            case 'reorder':
                handleReorder(orderId);
                break;
            case 'add-to-cart':
                handleAddToCart(orderId);
                break;
            case 'view-logistics':
                handleViewLogistics(orderId);
                break;
            default:
                showAlert('info', `操作 ${action} 暂未实现.`);
        }
    });
    
    // --- 2. 订单状态筛选 ---
    
    $('.order-filter-card a').on('click', function(e) {
        e.preventDefault();
        const $link = $(this);
        const status = $link.data('status');
        
        // 样式切换
        $('.order-filter-card a').removeClass('active');
        $link.addClass('active');
        
        // 筛选逻辑
        filterOrders(status);
        // 如果是从后端加载，则调用 loadOrders(status);
    });

    // --- 3. 核心功能处理函数 (模拟API交互) ---

    // 筛选显示订单
    function filterOrders(status) {
        if (status === 'all') {
            $('.order-card').fadeIn(200);
            return;
        }
        
        $('.order-card').hide();
        $(`.order-card[data-order-status="${status}"]`).fadeIn(200);
    }
    
    // 立即支付
    function handlePay(orderId, $card) {
        showAlert('success', `正在跳转支付页面，订单号: ${orderId}`);
        // 模拟支付成功后，将订单状态更新为“待发货”
        // updateOrderStatus(orderId, 'pending_shipment', $card, 'bg-warning text-dark', '待发货');
    }

    // 取消订单
    function handleCancel(orderId, $card) {
        if (confirm(`确定要取消订单 ${orderId} 吗？`)) {
            showAlert('info', `订单 ${orderId} 已取消。`);
            updateOrderStatus(orderId, 'cancelled', $card, 'bg-secondary', '已取消');
            // 实际：ajaxRequest('/api/orders/cancel', 'POST', { orderId: orderId }, ...);
        }
    }
    
    // 确认收货
    function handleConfirmReceipt(orderId, $card) {
        if (confirm(`您已收到订单 ${orderId} 的商品了吗？`)) {
            showAlert('success', `订单 ${orderId} 已确认收货。`);
            updateOrderStatus(orderId, 'completed', $card, 'bg-success', '已收货');
            // 实际：ajaxRequest('/api/orders/confirm', 'POST', { orderId: orderId }, ...);
        }
    }

    // 删除订单（仅对已取消或已收货订单可见）
    function handleDelete(orderId, $card) {
        if (confirm(`确定要删除订单 ${orderId} 吗？删除后不可恢复。`)) {
            showAlert('warning', `订单 ${orderId} 已删除。`);
            $card.fadeOut(300, function() {
                $(this).remove();
            });
            // 实际：ajaxRequest('/api/orders/delete', 'POST', { orderId: orderId }, ...);
        }
    }

    // 再买一单（将订单所有商品加入购物车并跳转）
    function handleReorder(orderId) {
        showAlert('info', `正在将订单 ${orderId} 的商品加入购物车...`);
        // 实际：ajaxRequest('/api/cart/add_from_order', 'POST', { orderId: orderId }, ...);
        // 成功后跳转: window.location.href = '/cart';
    }
    
    // 仅加入购物车
    function handleAddToCart(orderId) {
        showAlert('info', `正在将订单 ${orderId} 的商品加入购物车...`);
        // 实际：ajaxRequest('/api/cart/add_from_order', 'POST', { orderId: orderId, onlyAdd: true }, ...);
    }
    
    // 查看物流
    function handleViewLogistics(orderId) {
        // window.open(`/logistics/${orderId}`, '_blank');
        showAlert('info', `查看订单 ${orderId} 的物流信息...`);
    }

    // --- 4. 订单状态 UI 更新辅助函数 ---
    
    /**
     * 更新订单状态的样式和按钮，模拟后端成功响应。
     */
    function updateOrderStatus(orderId, newStatus, $card, badgeClass, badgeText) {
        // 1. 更新 data 属性和状态 badge
        $card.data('order-status', newStatus);
        $card.attr('data-order-status', newStatus); // 确保 CSS 选择器更新
        
        $card.find('.order-status-badge')
             .removeClass('bg-danger bg-warning text-dark bg-info bg-success bg-secondary')
             .addClass(badgeClass)
             .text(badgeText);
             
        // 2. 移除旧的操作按钮组
        $card.find('.order-actions').empty();

        // 3. 根据新状态添加新的操作按钮组
        let newActionsHtml = '';
        switch (newStatus) {
            case 'pending_shipment': // 待发货
                newActionsHtml = `<button class="btn btn-outline-secondary btn-sm" data-action="reorder">再买一单</button>`;
                break;
            case 'shipped': // 待收货
                newActionsHtml = `
                    <button class="btn btn-outline-primary btn-sm me-2" data-action="view-logistics">查看物流</button>
                    <button class="btn btn-primary btn-sm" data-action="confirm-receipt">确认收货</button>
                `;
                break;
            case 'completed': // 已收货
            case 'cancelled': // 已取消
                newActionsHtml = `
                    <button class="btn btn-outline-secondary btn-sm me-2" data-action="reorder">再买一单</button>
                    <button class="btn btn-outline-secondary btn-sm me-2" data-action="add-to-cart">加入购物车</button>
                    <button class="btn btn-danger btn-sm" data-action="delete">删除订单</button>
                `;
                break;
            case 'pending_payment': // 待支付
            default:
                newActionsHtml = `
                    <button class="btn btn-outline-danger btn-sm me-2" data-action="cancel">取消订单</button>
                    <button class="btn btn-primary btn-sm me-2" data-action="pay">立即支付</button>
                    <button class="btn btn-outline-secondary btn-sm" data-action="reorder">再买一单</button>
                `;
                break;
        }
        $card.find('.order-actions').html(newActionsHtml);
    }

// --- 5. 倒计时与自动取消逻辑 (修改后) ---

/**
 * 初始化所有“待支付”订单的倒计时。
 * 设定固定的 24 小时支付期限。
 */
function initOrderCountdowns() {
    // 获取当前时间戳
    const now = new Date().getTime();
    
    // 计算 24 小时后的时间戳 (24小时 * 60分钟/小时 * 60秒/分钟 * 1000毫秒/秒)
    const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;
    
    $('.order-card[data-order-status="pending_payment"]').each(function() {
        const $card = $(this);
        const $countdownDisplay = $card.find('.order-countdown');
        
        // -----------------------------------------------------------
        // 关键修改点: 
        // 1. 获取订单的创建时间（假设这是真实的起始时间，这里使用 data-order-date 模拟）
        //    如果没有，我们使用加载页面的时间作为起点，即 now。
        //    为了演示固定倒计时，我们这里基于订单的创建日期计算过期时间。
        // -----------------------------------------------------------
        
        // 假设订单创建日期存储在 order-date 元素中（来自 order_list.ejs）
        const createTimeString = $card.find('.order-date').text().trim();
        const createTime = new Date(createTimeString).getTime();
        
        // 计算新的过期时间：创建时间 + 24 小时
        const expireTime = createTime + TWENTY_FOUR_HOURS_IN_MS; 
        
        // 如果创建时间无效或未来时间已过，则直接跳过或设为已超时
        if (isNaN(createTime) || expireTime < now) {
            $countdownDisplay.text('已超时');
            // 如果已超时，立即触发自动取消（防止加载后订单仍显示待支付）
            if (expireTime < now) {
                autoCancelOrder($card);
            }
            return;
        }

        // 立即执行一次，并设置定时器
        // 注意：这里不再使用 data-order-expire-time 属性的值
        updateCountdown($card, $countdownDisplay, expireTime);
        
        // 每秒更新一次
        const intervalId = setInterval(function() {
            updateCountdown($card, $countdownDisplay, expireTime, intervalId);
        }, 1000);
    });
}

    /**
 * 更新单个订单的倒计时显示，支持小时、分钟、秒。
 */
function updateCountdown($card, $display, expireTime, intervalId) {
    const now = new Date().getTime();
    const distance = expireTime - now;

    if (distance < 0) {
        // 时间结束，执行自动取消
        if (intervalId) {
            clearInterval(intervalId);
        }
        $display.text('已超时');
        autoCancelOrder($card);
        return;
    }

    // 计算时间 (支持小时)
    const hours = Math.floor(distance / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    // 格式化输出 (补零)
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    $display.text(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
}

    /**
     * 自动取消订单的逻辑。
     */
    function autoCancelOrder($card) {
        const orderId = $card.data('order-id');
        showAlert('danger', `订单 ${orderId} 支付超时，已自动取消。`);
        // 调用和手动取消一样的更新逻辑
        updateOrderStatus(orderId, 'cancelled', $card, 'bg-secondary', '已取消');
        
        // 实际：发送一个 API 请求通知后端自动取消
        // ajaxRequest('/api/orders/auto_cancel', 'POST', { orderId: orderId }, ...);
    }
    
    // 页面加载完成后启动倒计时
    initOrderCountdowns();
});