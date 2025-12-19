// 通用JavaScript函数

// AJAX请求封装
function ajaxRequest(url, method, data, successCallback, errorCallback) {
    const ajaxConfig = {
        url: url,
        type: method,
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                if (successCallback) successCallback(response);
            } else {
                if (errorCallback) {
                    // 传递完整的响应信息给错误回调
                    errorCallback(response.message || '操作失败', { responseJSON: response });
                } else {
                    showAlert('danger', response.message || '操作失败');
                }
            }
        },
        error: function(xhr, status, error) {
            const message = xhr.responseJSON?.message || '网络错误，请稍后重试';
            if (errorCallback) {
                // 传递完整的xhr对象给错误回调
                errorCallback(message, xhr);
            } else {
                showAlert('danger', message);
            }
        }
    };
    
    // 对于POST/PUT/PATCH请求，设置正确的Content-Type和数据格式
    if (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH') {
        ajaxConfig.contentType = 'application/json';
        ajaxConfig.data = JSON.stringify(data);
    } else {
        ajaxConfig.data = data;
    }
    
    $.ajax(ajaxConfig);
}

// 显示提示信息
function showAlert(type, message, duration = 3000) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // 在页面顶部显示
    const container = $('<div class="alert-container position-fixed top-0 start-50 translate-middle-x mt-3" style="z-index: 9999;"></div>');
    container.html(alertHtml);
    $('body').append(container);
    
    setTimeout(() => {
        container.fadeOut(() => container.remove());
    }, duration);
}

// 格式化价格
function formatPrice(price) {
    return parseFloat(price).toFixed(2);
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 检查用户是否登录
function checkAuth() {
    return new Promise((resolve) => {
        ajaxRequest('/api/user/info', 'GET', null, 
            () => resolve(true),
            () => resolve(false)
        );
    });
}

// 页面加载完成后执行
$(document).ready(function() {
    // 初始化工具提示
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    initNavSearch();
    loadNavCategories();
    updateCartBadge(); // 更新购物车数量显示
    
    // 设置并同步导航栏高度到 CSS 变量 --nav-height，用作 main 的 padding-top
    if (typeof updateNavHeight === 'function') updateNavHeight();
    // 再次在 window load 后测量，确保字体/图片加载后的真实高度
    window.addEventListener('load', function() {
        if (typeof updateNavHeight === 'function') updateNavHeight();
    });
});

// 导航栏搜索
function initNavSearch() {
    const $form = $('#nav-search-form');
    if ($form.length === 0) return;

    $form.on('submit', function(e) {
        e.preventDefault();
        const keyword = $('#nav-search-input').val().trim();
        if (!keyword) {
            showAlert('warning', '请输入搜索关键词');
            return;
        }
        // 跳转到搜索页，携带关键词和搜索类型
        const type = $('.nav-search-select').val() || 'product';
        const params = new URLSearchParams({ q: keyword, type });
        window.location.href = `/search?${params.toString()}`;
    });
}

// 导航栏分类下拉
function loadNavCategories() {
    const $dropdown = $('#nav-category-dropdown');
    if ($dropdown.length === 0) return;

    ajaxRequest('/api/categories', 'GET', null,
        function(response) {
            const categories = response.data || [];
            if (categories.length === 0) {
                $dropdown.html('<div class="py-2 px-3 text-muted small">暂无分类</div>');
                return;
            }

            let html = '<div class="row g-2 px-3 py-2">';
            categories.forEach(cat => {
                html += `
                    <div class="col-6">
                        <a class="dropdown-item" href="/category/${cat.id}">
                            <i class="bi bi-${cat.icon || 'box'} me-2"></i>${cat.name}
                        </a>
                    </div>
                `;
            });
            html += '</div>';

            $dropdown.html(html);
        },
        function(message) {
            $dropdown.html(`<div class="py-2 px-3 text-danger small">${message}</div>`);
        }
    );
}

// Measure navbar height and expose it as CSS variable --nav-height.
// This keeps `main`'s top padding precisely aligned with the real navbar height,
// and updates on window resize or when the navbar height may change.
function updateNavHeight() {
    try {
        const nav = document.querySelector('.navbar');
        if (!nav) return;

        const setVar = (h) => document.documentElement.style.setProperty('--nav-height', h + 'px');

        // Use scrollHeight/offsetHeight to include padding/border
        let height = nav.offsetHeight || nav.getBoundingClientRect().height || 84;
        // set initially
        setVar(Math.round(height));

        // Debounced resize handler
        let rTimer = null;
        window.addEventListener('resize', function() {
            if (rTimer) clearTimeout(rTimer);
            rTimer = setTimeout(() => {
                const h2 = nav.offsetHeight || nav.getBoundingClientRect().height || height;
                setVar(Math.round(h2));
            }, 120);
        });
    } catch (e) {
        // silent
        console.debug('updateNavHeight error', e);
    }
}

// 更新购物车数量徽章
function updateCartBadge() {
    const $badge = $('.cart-badge');
    if ($badge.length === 0) return;
    
    // 检查是否登录
    ajaxRequest('/api/cart/status', 'GET', null,
        function(response) {
            if (response.success && response.isLoggedIn) {
                // 已登录，获取服务器端购物车数量
                ajaxRequest('/api/cart/count', 'GET', null,
                    function(countResponse) {
                        if (countResponse.success) {
                            const count = countResponse.count || 0;
                            updateBadgeDisplay(count);
                        }
                    },
                    function() {
                        // 获取失败，隐藏徽章
                        $badge.hide();
                    }
                );
            } else {
                // 未登录，检查本地存储
                try {
                    const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
                    const count = localCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
                    updateBadgeDisplay(count);
                } catch (error) {
                    console.warn('读取本地购物车失败:', error);
                    $badge.hide();
                }
            }
        },
        function() {
            // 检查登录状态失败，尝试读取本地存储
            try {
                const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
                const count = localCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
                updateBadgeDisplay(count);
            } catch (error) {
                console.warn('读取本地购物车失败:', error);
                $badge.hide();
            }
        }
    );
}

// 更新徽章显示
function updateBadgeDisplay(count) {
    const $badge = $('.cart-badge');
    if (count > 0) {
        $badge.text(count).show();
    } else {
        $badge.hide();
    }
}

// 全局函数：供其他页面调用以更新购物车数量
window.updateCartCount = updateCartBadge;



