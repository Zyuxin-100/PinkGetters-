// 商品详情页逻辑
$(document).ready(function() {
    const productId = $('main.product-page').data('product-id');
    if (!productId) return;
    loadProduct(productId);
    bindTabs();
    bindQuantity();
});

function loadProduct(productId) {
    ajaxRequest(`/api/products/${productId}`, 'GET', null,
        function(response) {
            if (!response.success || !response.data) {
                renderError('无法获取商品信息');
                return;
            }
            const product = response.data;
            renderProduct(product);
            renderShop(product.shop);
            renderGallery(product);
                    renderReviews(product);
        },
        function() { renderError('加载失败'); }
    );
}

function renderProduct(product) {
    $('#product-name').text(product.name || '商品');
    $('#product-category').text(product.category ? `所属分类：${product.category.name}` : '未分类');
    $('#product-price').text(`¥ ${formatPrice(product.price)}`);
    $('#product-stock').text(product.stock ? `库存：${product.stock}` : '库存充足');
    $('#product-description').text(product.description || '这件商品正在火热上架，更多细节即将呈现。');

    // 简易元信息
    const meta = [
        { label: '品牌', value: product.brand || '官方精选' },
        { label: '发货地', value: product.origin || '中国' },
        { label: '上架时间', value: (product.created_at || '').toString().slice(0,10) }
    ];
    const metaHtml = meta.map(m => `
        <div class="col-6 col-md-4">
            <div class="meta-item">
                <span class="meta-label">${m.label}</span>
                <span class="meta-value">${m.value || '--'}</span>
            </div>
        </div>
    `).join('');
    $('#product-meta').html(metaHtml);
    // 渲染可选项（如颜色/尺码/规格）
    renderOptions(product);
}

// 当前选择状态
let currentSelectedOptions = {};
let currentSelectedVariant = null;

// 属性名与属性值的中英文映射，用于在详情页渲染为中文
const ATTRIBUTE_NAME_MAP = {
    'color': '颜色',
    'size': '尺寸',
    'warranty': '保修',
    'type': '类型',
    'mode': '模式',
    'material': '材质',
    'style': '款式'
};

const ATTRIBUTE_VALUE_MAP = {
    'color': {
        'white': '白', 'black': '黑', 'red': '红', 'blue': '蓝', 'green': '绿', 'yellow': '黄', 'pink': '粉'
    },
    'size': {
        's': '小', 'm': '中', 'l': '大', 'xl': '加大', 'xs': '加小',
        'small': '小', 'medium': '中', 'large': '大'
    },
    'warranty': {
        'one year': '一年', '1 year': '一年', 'two years': '两年', '3 years': '三年'
    },
    'mode': {
        // 示例：如果后端写英文模式名，可以在此映射
        'auto': '自动', 'manual': '手动'
    }
};

function translateAttrName(name) {
    if (!name) return name;
    const key = String(name).toLowerCase();
    return ATTRIBUTE_NAME_MAP[key] || name;
}

function translateAttrValue(attrName, val) {
    if (val == null) return val;
    const map = ATTRIBUTE_VALUE_MAP[(attrName || '').toString().toLowerCase()];
    if (!map) return val;
    const key = String(val).toLowerCase();
    return map[key] || val;
}

function renderOptions(product) {
    const $box = $('#product-options');
    $box.html('');

    // 优先使用 product.attributes（对象），例如 { color: ['白','黑'], size: ['M','L'] }
    const attrs = product.attributes || {};

    // 如果没有 attributes，但有 variants，尝试从 variants 推断属性名
    if (!Object.keys(attrs).length && Array.isArray(product.variants) && product.variants.length) {
        // collect attribute keys from first variant.attributes
        const first = product.variants[0] && product.variants[0].attributes;
        if (first && typeof first === 'object') {
            Object.keys(first).forEach(k => { attrs[k] = []; });
            // fill options by scanning variants
            product.variants.forEach(v => {
                Object.entries(v.attributes || {}).forEach(([k, val]) => {
                    if (!attrs[k].includes(val)) attrs[k].push(val);
                });
            });
        }
    }

    // render selects for each attribute (translate names/values to Chinese when possible)
    Object.keys(attrs).forEach(attrName => {
        const options = attrs[attrName] || [];
        if (!options.length) return;
        const selId = `opt-${attrName}`;
        const displayName = translateAttrName(attrName);
        let html = `<div class="product-option mb-2">
            <label class="form-label small text-muted">${displayName}</label>
            <select id="${selId}" class="form-select form-select-sm" data-attr-name="${attrName}">`;
        html += `<option value="">请选择</option>`;
        options.forEach(opt => {
            const displayVal = translateAttrValue(attrName, opt);
            html += `<option value="${opt}">${displayVal}</option>`;
        });
        html += `</select></div>`;
        $box.append(html);
    });

    // if variants list provided, show quick info
    if (Array.isArray(product.variants) && product.variants.length) {
        // attach change handlers to selects to resolve variant
        $box.on('change', 'select', function() {
            const name = $(this).data('attr-name');
            const val = $(this).val();
            if (val) currentSelectedOptions[name] = val; else delete currentSelectedOptions[name];
            // try to find matching variant
            currentSelectedVariant = findMatchingVariant(product, currentSelectedOptions);
            updatePriceAndStock(product);
        });

        // also render a small helper when no attributes: show variant dropdown
        if (!Object.keys(attrs).length) {
            // variants may have sku/price
            let html = `<div class="product-option mb-2"><label class="form-label small text-muted">规格</label><select id="opt-variant" class="form-select form-select-sm">`;
            html += `<option value="">请选择</option>`;
            product.variants.forEach(v => {
                const label = v.sku || Object.entries(v.attributes || {}).map(([k,val]) => `${translateAttrName(k)}:${translateAttrValue(k,val)}`).join(' / ') || ('变体 ' + (v.sku||''));
                html += `<option value="${v.sku || JSON.stringify(v.attributes)}">${label} ${v.price ? ' - ¥' + v.price : ''}</option>`;
            });
            html += `</select></div>`;
            $box.append(html);
            $box.on('change', '#opt-variant', function() {
                const val = $(this).val();
                const found = product.variants.find(v => (v.sku === val) || (JSON.stringify(v.attributes) === val));
                currentSelectedVariant = found || null;
                updatePriceAndStock(product);
            });
        }
    }

    // initialize: if product has default variant or single option, select first
    // auto-select first option values for convenience
    Object.keys(attrs).forEach(attr => {
        const sel = $(`#opt-${attr}`);
        if (sel.length && sel.find('option').length > 1) {
            sel.find('option').eq(1).prop('selected', true).trigger('change');
        }
    });
}

function findMatchingVariant(product, selectedOptions) {
    if (!Array.isArray(product.variants)) return null;
    return product.variants.find(v => {
        const va = v.attributes || {};
        return Object.keys(selectedOptions).every(k => String(va[k]) === String(selectedOptions[k]));
    }) || null;
}

function updatePriceAndStock(product) {
    if (currentSelectedVariant) {
        // variant may override price/stock
        if (currentSelectedVariant.price) {
            $('#product-price').text(`¥ ${formatPrice(currentSelectedVariant.price)}`);
        } else {
            $('#product-price').text(`¥ ${formatPrice(product.price)}`);
        }
        const stock = typeof currentSelectedVariant.stock !== 'undefined' ? currentSelectedVariant.stock : product.stock;
        $('#product-stock').text(stock ? `库存：${stock}` : '库存充足');
    } else {
        $('#product-price').text(`¥ ${formatPrice(product.price)}`);
        $('#product-stock').text(product.stock ? `库存：${product.stock}` : '库存充足');
    }
}

function renderShop(shop) {
    if (!shop) {
        $('#shop-name').text('自营店');
        $('#shop-desc').text('官方直供，正品保障');
        $('#shop-rating').text('4.9');
        $('#shop-logo').addClass('bg-placeholder');
        return;
    }
    $('#shop-name').text(shop.name);
    $('#shop-desc').text(shop.description || '');
    $('#shop-rating').text((shop.rating || 4.8).toFixed(1));
    $('#shop-address').text(shop.address || '');
    $('#shop-logo').css('background-image', `url(${shop.logo_url || '/images/product-default.svg'})`);

    // Wire up shop action buttons
    // 进店按钮跳转到 /shop/:id if route exists (page may be implemented later)
    if (shop.id) {
        $('#btn-open-shop').attr('href', `/shop/${shop.id}`);
    } else if (shop.shop_id) {
        $('#btn-open-shop').attr('href', `/shop/${shop.shop_id}`);
    } else {
        $('#btn-open-shop').attr('href', '#');
    }

    // 客服按钮: currently a placeholder; open a small chat modal or link.
    $('#btn-chat').off('click').on('click', function() {
        // If shop has contact info, use it; else show a simple alert for now
        const contact = shop.contact || shop.support || null;
        if (contact) {
            // if contact is an URL, open it
            if (String(contact).startsWith('http')) window.open(contact, '_blank');
            else alert('联系商家: ' + contact);
        } else {
            alert('正在为您接通客服（示例）。');
        }
    });
}

function renderGallery(product) {
    const main = $('#main-image');
    const thumbs = $('#thumb-list');
    const media = collectMedia(product);
    if (!media.length) return;

    const renderMain = (item) => {
        if (item.type === 'video') {
            // 视频：添加固定尺寸控制
            main.html(`
                <div style="
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    background: #000; 
                    border-radius: 8px; 
                    overflow: hidden;
                    max-height: 400px;
                    width: 100%;
                ">
                    <video src="${item.src}" 
                           style="
                               max-height: 400px;
                               max-width: 100%;
                               object-fit: contain;
                           "
                           autoplay 
                           muted 
                           loop 
                           playsinline 
                           controls 
                           onerror="this.poster='/images/product-default.svg'">
                    </video>
                </div>
            `);
        } else {
            // 图片：保持原来的尺寸和样式，移除任何尺寸限制
            main.html(`<img src="${item.src}" class="w-100 h-90" alt="${product.name}" onerror="this.src='/images/product-default.svg'">`);
        }
    };
    renderMain(media[0]);

    let thumbHtml = '';
    media.forEach((it, idx) => {
        const dataType = it.type === 'video' ? 'video' : 'image';
        thumbHtml += `
            <div class="thumb ${idx === 0 ? 'active' : ''} position-relative" data-src="${it.src}" data-type="${dataType}">
                <img src="${it.thumb || it.src}" alt="thumb" class="thumb-img" onerror="this.src='/images/product-default.svg'">
                ${it.type === 'video' ? '<div class="play-overlay">▶</div>' : ''}
            </div>
        `;
    });
    thumbs.html(thumbHtml);

    thumbs.off('click').on('click', '.thumb', function() {
        const src = $(this).data('src');
        const type = $(this).data('type');
        $('.thumb', thumbs).removeClass('active');
        $(this).addClass('active');
        renderMain({ type: type, src: src });
    });
}

// 确保缩略图样式正确
$(document).ready(function() {
    const thumbCSS = `
        .thumb {
            width: 60px;
            height: 60px;
            border-radius: 4px;
            overflow: hidden;
            cursor: pointer;
            border: 2px solid transparent;
            opacity: 0.7;
            transition: all 0.2s ease;
        }
        
        .thumb.active {
            border-color: #007bff;
            opacity: 1;
        }
        
        .thumb-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .play-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
        }
    `;
    
    if (!$('.thumb-styles').length) {
        $('head').append(`<style class="thumb-styles">${thumbCSS}</style>`);
    }
});

function collectMedia(product) {
    const list = [];
    // prefer images
    if (product.image_url) list.push({ type: 'image', src: product.image_url });
    if (Array.isArray(product.images)) {
        product.images.forEach(img => { if (img) list.push({ type: 'image', src: img }); });
    }
    // videos (optional)
    if (Array.isArray(product.videos)) {
        product.videos.forEach(v => { if (v && v.src) list.push({ type: 'video', src: v.src, thumb: v.thumb || (v.poster || null) }); });
    } else if (product.video_url) {
        list.push({ type: 'video', src: product.video_url, thumb: product.video_poster || null });
    }
    if (!list.length) list.push({ type: 'image', src: '/images/product-default.svg' });
    return list;
}

function bindTabs() {
    $('.product-detail-card .btn-link').on('click', function() {
        $('.product-detail-card .btn-link').removeClass('active');
        $(this).addClass('active');
        const target = $(this).data('target');
        if (target) {
            $('html, body').animate({ scrollTop: $(target).offset().top - 80 }, 200);
        }
    });
}

function bindQuantity() {
    const input = $('#qty-input');
    $('#qty-decrease').on('click', () => {
        const val = Math.max(1, parseInt(input.val(), 10) - 1);
        input.val(val);
    });
    $('#qty-increase').on('click', () => {
        const val = Math.max(1, parseInt(input.val(), 10) + 1);
        input.val(val);
    });
    $('#btn-add-cart').on('click', () => {
        const qty = Math.max(1, parseInt(input.val(), 10));
        const variantSku = currentSelectedVariant ? (currentSelectedVariant.sku || null) : null;
        const selected = { qty, variant: variantSku, options: currentSelectedOptions };
        
        // 调用加入购物车函数
        addToCart(qty, variantSku, currentSelectedOptions);
    });
    $('#btn-buy-now').on('click', () => {
        const qty = Math.max(1, parseInt(input.val(), 10));
        const variantSku = currentSelectedVariant ? (currentSelectedVariant.sku || null) : null;
        
        // 从页面获取productId
        const productId = $('main.product-page').data('product-id');
        
        if (!productId) {
            showCartMessage('商品信息错误', 'error');
            return;
        }
        
        // 检查登录状态
        checkLoginStatus().then(isLoggedIn => {
            if (!isLoggedIn) {
                // 未登录，跳转到登录页面
                if (confirm('请先登录后再购买，是否前往登录页面？')) {
                    window.location.href = '/auth/login?redirect=' + encodeURIComponent(`/checkout?productId=${productId}&quantity=${qty}`);
                }
                return;
            }
            
            // 已登录，跳转到订单确认页面
            window.location.href = `/checkout?productId=${productId}&quantity=${qty}`;
        }).catch(error => {
            console.error('检查登录状态失败:', error);
            showCartMessage('系统错误，请稍后重试', 'error');
        });
    });

    // forward floating bar buttons (if present) to the main handlers
    $('#btn-add-cart-float').on('click', function() { $('#btn-add-cart').trigger('click'); });
    $('#btn-buy-now-float').on('click', function() { $('#btn-buy-now').trigger('click'); });
}

// Back button: prevent default anchor navigation, try history.back(), fallback to homepage
$(document).ready(function() {
    $('#btn-back').on('click', function(e) {
        e.preventDefault();
        if (document.referrer && document.referrer !== window.location.href) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    });
});

function renderError(msg) {
    $('.product-page').html(`<p class="text-danger">${msg}</p>`);
}

// 渲染商品评价
function renderReviews(product) {
    const $list = $('#review-list');
    $list.html('');
    const reviews = product.reviews || [];

    if (!reviews.length) {
        $list.html('<p class="text-muted">暂无评价，期待你的第一条评论～</p>');
        return;
    }

    // summary: average rating and total
    const avg = product.rating || (reviews.reduce((s, r) => s + (r.rating||0), 0) / reviews.length).toFixed(1);
    const summaryHtml = `<div class="mb-3 d-flex align-items-center justify-content-between">
            <div>
                <div class="text-muted small">平均评分：<strong>${avg}</strong> ・ 共 ${reviews.length} 条评价</div>
            </div>
        </div>`;
    $list.append(summaryHtml);

    // 渲染所有评价
    function renderReviewItems(reviewList) {
        reviewList.forEach(r => {
            const user = r.user || {};
            const name = user.username || '匿名用户';
            const avatar = user.avatar || '/images/avatar-default.png';
            const time = r.created_at ? (new Date(r.created_at)).toLocaleString() : '';
            const stars = '<span class="text-warning">' + '★'.repeat(Math.max(0, Math.round(r.rating||0))) + '</span>';
            const imagesHtml = (r.images && r.images.length) ? `<div class="d-flex gap-2 mt-2">` + r.images.map(src => `<img src="${src}" style="width:84px;height:84px;object-fit:cover;border-radius:8px;" onerror="this.src='/images/product-default.svg'">`).join('') + `</div>` : '';
            const verified = r.is_verified_purchase ? '<span class="badge bg-success ms-2">已购</span>' : '';

            const reviewHtml = `
                <div class="d-flex gap-3 mb-3 review-item">
                    <img src="${avatar}" alt="avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2">
                            <strong>${name}</strong>
                            ${verified}
                            <div class="text-muted small ms-auto">${time}</div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <div class="d-flex align-items-center">
                                <!-- 星级评分和标题 -->
                                <div class="me-3">
                                    ${stars}
                                </div>
                                <strong>${r.title || ''}</strong>
                            </div>
                            <!-- 点赞按钮 -->
                            <div class="like-display" title="点赞数">
                               <span class="text-muted">
                                   👍 ${r.likes || 0}
                               </span>
                            </div>
                        </div>
                        <div class="text-muted mt-2">${r.content || ''}</div>
                        ${imagesHtml}
                        
                    </div>
                </div>
            `;
            $list.append(reviewHtml);
        });
    }

    // 初次渲染，只显示前5条评价
    const visible = reviews.slice(0, 5);
    renderReviewItems(visible);

    if (reviews.length > visible.length) {
        // 添加"加载更多"按钮
        $list.append(`<div class="text-center mt-3" id="load-more-container">
            <button id="btn-load-more-reviews" class="btn btn-outline-primary btn-sm">加载更多评价</button>
        </div>`);
        
        $('#btn-load-more-reviews').on('click', function() {
            const $btn = $(this);
            // 显示剩余的评价
            const rest = reviews.slice(5);
            renderReviewItems(rest);
            
            // 移除"加载更多"按钮
            $('#load-more-container').remove();
            
            // 在所有评价渲染完成后，再添加"收起评价"按钮
            $list.append(`
                <div class="text-center mt-3" id="collapse-container">
                    <button id="btn-collapse-reviews" class="btn btn-outline-secondary btn-sm">
                        <i class="bi bi-chevron-up"></i> 收起多余评价
                    </button>
                </div>
            `);
            
            // 绑定收起按钮事件
            $('#btn-collapse-reviews').on('click', function() {
                collapseReviews(reviews);
            });
            
            bindReviewLikeButtons();
        });
    }

    bindReviewLikeButtons();
}

// 收起评价函数
function collapseReviews(reviews) {
    const $list = $('#review-list');
    const $reviewItems = $list.find('.review-item');
    
    // 隐藏第5条之后的所有评价
    $reviewItems.slice(5).slideUp(300, function() {
        // 动画完成后完全移除这些元素
        $(this).remove();
        
        // 移除收起按钮
        $('#collapse-container').remove();
        
        // 清除所有可能存在的"加载更多"按钮
        $('#load-more-container').remove();
        
        // 重新显示"加载更多"按钮
        $list.append(`<div class="text-center mt-3" id="load-more-container">
            <button id="btn-load-more-reviews" class="btn btn-outline-primary btn-sm">加载更多评价</button>
        </div>`);
        
        // 重新绑定"加载更多"事件
        $('#btn-load-more-reviews').on('click', function() {
            const $btn = $(this);
            const rest = reviews.slice(5);
            
            rest.forEach(r => {
                const user = r.user || {};
                const name = user.username || '匿名用户';
                const avatar = user.avatar || '/images/avatar-default.png';
                const time = r.created_at ? (new Date(r.created_at)).toLocaleString() : '';
                const stars = '<span class="text-warning">' + '★'.repeat(Math.max(0, Math.round(r.rating||0))) + '</span>';
                const imagesHtml = (r.images && r.images.length) ? `<div class="d-flex gap-2 mt-2">` + r.images.map(src => `<img src="${src}" style="width:84px;height:84px;object-fit:cover;border-radius:8px;" onerror="this.src='/images/product-default.svg'">`).join('') + `</div>` : '';
                const verified = r.is_verified_purchase ? '<span class="badge bg-success ms-2">已购</span>' : '';
                const reviewHtml = `
                    <div class="d-flex gap-3 mb-3 review-item">
                        <img src="${avatar}" alt="avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center gap-2">
                                <strong>${name}</strong>
                                ${verified}
                                <div class="text-muted small ms-auto">${time}</div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <div class="d-flex align-items-center">
                                    <div class="me-3">
                                        ${stars}
                                    </div>
                                    <strong>${r.title || ''}</strong>
                                </div>
                                <div class="like-display" title="点赞数">
                                   <span class="text-muted">
                                       👍 ${r.likes || 0}
                                   </span>
                                </div>
                            </div>
                            <div class="text-muted mt-2">${r.content || ''}</div>
                            ${imagesHtml}
                        </div>
                    </div>
                `;
                $list.append(reviewHtml);
            });
            
            // 移除"加载更多"按钮
            $('#load-more-container').remove();
            
            // 在所有评价渲染完成后，再添加"收起评价"按钮
            $list.append(`
                <div class="text-center mt-3" id="collapse-container">
                    <button id="btn-collapse-reviews" class="btn btn-outline-secondary btn-sm">
                        <i class="bi bi-chevron-up"></i> 收起多余评价
                    </button>
                </div>
            `);
            
            // 重新绑定收起按钮事件
            $('#btn-collapse-reviews').on('click', function() {
                collapseReviews(reviews);
            });
            
            bindReviewLikeButtons();
        });
    });
}

function bindReviewLikeButtons() {
    $('.btn-like').off('click').on('click', function() {
        const $btn = $(this);
        const id = $btn.data('review-id');
        const $count = $btn.find('.like-count');
        let n = parseInt($count.text(), 10) || 0;
        n += 1;
        $count.text(n);
        // TODO: call API to persist like (not implemented). This is UI-only increment.
        $btn.prop('disabled', true);
    });
}

// 加入购物车功能
function addToCart(quantity, variantSku, selectedOptions) {
    const productId = $('main.product-page').data('product-id');
    
    if (!productId) {
        showCartMessage('商品信息错误', 'error');
        return;
    }
    
    // 首先检查登录状态
    checkLoginStatus().then(isLoggedIn => {
        if (!isLoggedIn) {
            // 未登录，跳转到登录页面
            if (confirm('请先登录后再加入购物车，是否前往登录页面？')) {
                window.location.href = '/auth/login';
            }
            return;
        }
        
        // 已登录，调用API加入购物车
        const requestData = {
            productId: productId,
            quantity: quantity
        };
        
        // 如果有选择的变体或选项，添加到请求中
        if (variantSku) {
            requestData.variantSku = variantSku;
        }
        if (selectedOptions && Object.keys(selectedOptions).length > 0) {
            requestData.options = selectedOptions;
        }
        
        ajaxRequest('/api/cart/add', 'POST', requestData,
            function(response) {
                if (response.success) {
                    showCartMessage('已加入购物车，可以在购物车页面查看', 'success');
                    // 可选：更新购物车图标的数量显示
                    updateCartCount();
                } else {
                    showCartMessage(response.message || '加入购物车失败', 'error');
                }
            },
            function(error) {
                showCartMessage('网络错误，请稍后重试', 'error');
            }
        );
    }).catch(error => {
        console.error('检查登录状态失败:', error);
        showCartMessage('系统错误，请稍后重试', 'error');
    });
}

// 检查登录状态
function checkLoginStatus() {
    return new Promise((resolve, reject) => {
        ajaxRequest('/api/cart/status', 'GET', null,
            function(response) {
                resolve(response.success && response.isLoggedIn);
            },
            function(error) {
                reject(error);
            }
        );
    });
}

// 显示购物车消息提示
function showCartMessage(message, type) {
    // 移除已存在的提示
    $('.cart-message').remove();
    
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 'alert-info';
    
    const icon = type === 'success' ? 'bi-check-circle' : 
                 type === 'error' ? 'bi-exclamation-triangle' : 'bi-info-circle';
    
    const messageHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show cart-message position-fixed" 
             style="top: 100px; right: 20px; z-index: 1050; min-width: 300px;">
            <i class="bi ${icon} me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    $('body').append(messageHtml);
    
    // 3秒后自动消失
    setTimeout(() => {
        $('.cart-message').fadeOut(300, function() {
            $(this).remove();
        });
    }, 3000);
}

// 更新购物车数量显示（可选功能）
function updateCartCount() {
    // 调用全局的购物车数量更新函数
    if (typeof window.updateCartCount === 'function') {
        window.updateCartCount();
    }
}


