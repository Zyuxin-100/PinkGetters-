// 搜索结果页脚本
$(document).ready(function() {
    const params = new URLSearchParams(window.location.search);
    const mainType = $('main').data('search-type');
    const typeParam = params.get('type');
    const type = (typeParam || mainType || 'product') === 'shop' ? 'shop' : 'product';
    const keyword = params.get('q') || '';

    $('#nav-search-input').val(keyword);
    $('.nav-search-select').val(type);

    // 显式隐藏两个控件组，再按类型展示需要的（用 d-none 避免与 Bootstrap d-flex !important 冲突）
    $('#product-search-controls, #shop-search-controls').addClass('d-none');

    // 根据搜索类型显示不同的控件
    if (type === 'shop') {
        $('#shop-search-controls').removeClass('d-none');
        const shopState = {
            sort: 'sales_desc',
            shops: [],
            keyword: keyword
        };
        fetchShops(keyword, shopState);
        bindShopSortControls(shopState);
    } else {
        $('#product-search-controls').removeClass('d-none');
        const state = {
            sort: 'new',
            filters: {
                priceMin: null,
                priceMax: null,
                inStock: false,
                ratingMin: null
            },
            products: [],
            keyword: keyword
        };
        fetchProducts(keyword, state);
        bindSearchSortAndFilter(state);
    }
});

function bindSearchSortAndFilter(state) {
    // 排序按钮（仅商品排序组）
    $('#product-search-controls .sort-btn').on('click', function() {
        const sort = $(this).data('sort');
        if (state.sort === sort) return;
        setActiveSortButton(sort);
        state.sort = sort;
        renderSearchWithSort(state);
    });

    // 筛选应用
    $('#search-filter-apply').on('click', function() {
        state.filters = readSearchFilters();
        renderSearchWithFilters(state);
        closeSearchFilterDropdown();
    });

    // 筛选重置
    $('#search-filter-reset').on('click', function() {
        $('#search-filter-price-min').val('');
        $('#search-filter-price-max').val('');
        $('#search-filter-rating').val('');
        $('#search-filter-instock').prop('checked', false);
        state.filters = { priceMin: null, priceMax: null, inStock: false, ratingMin: null };
        renderSearchWithFilters(state);
    });
}

function setActiveSortButton(sort) {
    const $group = $('#product-search-controls');
    $group.find('.sort-btn').removeClass('active');
    $group.find(`.sort-btn[data-sort="${sort}"]`).addClass('active');
}

function closeSearchFilterDropdown() {
    const dropdownToggle = document.getElementById('btn-search-filter');
    if (!dropdownToggle || typeof bootstrap === 'undefined') return;
    const inst = bootstrap.Dropdown.getInstance(dropdownToggle);
    if (inst) inst.hide();
}

function readSearchFilters() {
    const minVal = parseFloat($('#search-filter-price-min').val());
    const maxVal = parseFloat($('#search-filter-price-max').val());
    const ratingVal = parseFloat($('#search-filter-rating').val());
    return {
        priceMin: Number.isFinite(minVal) ? minVal : null,
        priceMax: Number.isFinite(maxVal) ? maxVal : null,
        inStock: $('#search-filter-instock').is(':checked'),
        ratingMin: Number.isFinite(ratingVal) ? ratingVal : null
    };
}

function renderSearchWithSort(state) {
    const filtered = applySearchFilters(state.products, state.filters);
    const sorted = sortProducts(filtered, state.sort);
    renderProductResults(sorted);
}

function renderSearchWithFilters(state) {
    const filtered = applySearchFilters(state.products, state.filters);
    const sorted = sortProducts(filtered, state.sort);
    renderProductResults(sorted);
}

function sortProducts(products, sort) {
    const copy = products.slice();
    switch (sort) {
        case 'sold_desc':
            return copy.sort((a, b) => (b.sold || 0) - (a.sold || 0));
        case 'rating_desc':
            return copy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        case 'price_asc':
            return copy.sort((a, b) => (a.price || 0) - (b.price || 0));
        case 'price_desc':
            return copy.sort((a, b) => (b.price || 0) - (a.price || 0));
        case 'new':
        default:
            return copy.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
}

function applySearchFilters(products, filters) {
    return (products || []).filter(p => {
        if (filters.inStock && (!Number.isFinite(p.stock) || p.stock <= 0)) return false;
        if (filters.priceMin !== null && Number(p.price) < filters.priceMin) return false;
        if (filters.priceMax !== null && Number(p.price) > filters.priceMax) return false;
        if (filters.ratingMin !== null && (!p.rating || p.rating < filters.ratingMin)) return false;
        return true;
    });
}

function fetchProducts(keyword, state) {
    const qs = keyword ? `?q=${encodeURIComponent(keyword)}` : '';
    ajaxRequest(`/api/products${qs}`, 'GET', null,
        res => {
            state.products = res.data || [];
            const filtered = applySearchFilters(state.products, state.filters);
            const sorted = sortProducts(filtered, state.sort);
            renderProductResults(sorted);
        },
        msg => renderError(msg || '加载商品失败')
    );
}

function fetchShops(keyword, state) {
    const qs = keyword ? `?q=${encodeURIComponent(keyword)}` : '';
    ajaxRequest(`/api/shops${qs}`, 'GET', null,
        res => {
            state.shops = res.data || [];
            const sorted = sortShops(state.shops, state.sort);
            renderShopResults(sorted);
        },
        msg => renderError(msg || '加载店铺失败')
    );
}

function renderProductResults(list) {
    const $wrap = $('#search-result-list');
    if (!list.length) {
        $wrap.html(`<div class="col-12 text-center py-5 text-muted">没有找到相关商品</div>`);
        return;
    }
    let html = '';
    list.forEach(p => {
        const img = p.image_url || '/images/product-default.svg';
        html += `
        <div class="col-6 col-md-4 col-lg-3 col-xl-2-4">
            <a href="/product/${p.id}" class="product-card-link">
                <article class="card product-card h-100">
                    <div class="product-image-wrap">
                        <img src="${img}" class="card-img-top product-image" alt="${(p.name||'商品').replace(/"/g,'')}" onerror="this.src='/images/product-default.svg'">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${p.name}</h5>
                        <p class="card-text">${p.description || '精选好物'}</p>
                        <div class="d-flex align-items-center gap-2 mt-auto">
                            <span class="product-price">${formatPrice(p.price)}</span>
                        </div>
                    </div>
                </article>
            </a>
        </div>
        `;
    });
    $wrap.html(html);
}

function renderShopResults(list) {
    const $wrap = $('#search-result-list');
    if (!list.length) {
        $wrap.html(`<div class="col-12 text-center py-5 text-muted">没有找到相关店铺</div>`);
        return;
    }
    
    let html = '';
    list.forEach(s => {
        html += `
        <div class="col-12 mb-4">
            <div class="shop-result-card card">
                <div class="card-body">
                    <div class="row">
                        <!-- 左侧店铺信息 -->
                        <div class="col-md-4">
                            <div class="d-flex align-items-start gap-3">
                                <div class="shop-logo-large" style="background-image:url('${s.logo_url || '/images/product-default.svg'}'); width: 80px; height: 80px; background-size: cover; background-position: center; border-radius: 12px; flex-shrink: 0;"></div>
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center gap-2 mb-2">
                                        <h5 class="mb-0 fw-bold">${s.name}</h5>
                                        <span class="badge bg-primary">${(s.rating || 4.8).toFixed(1)} ★</span>
                                    </div>
                                    <p class="text-muted small mb-2">${s.description || '优质商家，值得信赖'}</p>
                                    <div class="shop-stats d-flex flex-wrap gap-3 small text-muted mb-2">
                                        <span><i class="bi bi-geo-alt"></i> ${s.address || '全国发货'}</span>
                                        <span><i class="bi bi-box"></i> ${s.productCount || 0} 件商品</span>
                                        <span><i class="bi bi-fire"></i> ${s.totalSales || 0} 销量</span>
                                    </div>
                                    <div class="shop-actions">
                                        <a href="/shop/${s.id}" class="btn btn-primary btn-sm">
                                            <i class="bi bi-shop"></i> 进入店铺
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 右侧商品滚动列表 -->
                        <div class="col-md-8">
                            <div class="shop-products-section">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h6 class="mb-0 text-muted">店铺商品</h6>
                                    <small class="text-muted">向右滑动查看更多</small>
                                </div>
                                <div class="shop-products-scroll" id="shop-products-${s.id}">
                                    <div class="loading-placeholder" style="height: 120px; border-radius: 8px;">
                                        <div class="d-flex align-items-center justify-content-center h-100">
                                            <span class="text-muted">加载商品中...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    $wrap.html(html);
    
    // 加载每个店铺的商品
    list.forEach(shop => {
        loadShopProducts(shop.id);
    });
}

function renderError(msg) {
    $('#search-result-list').html(`<div class="col-12 text-center text-danger py-5">${msg}</div>`);
}

// 店铺排序函数
function sortShops(shops, sort) {
    const copy = shops.slice();
    switch (sort) {
        case 'rating_desc':
            return copy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        case 'products_desc':
            return copy.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
        case 'sales_desc':
        default:
            return copy.sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0));
    }
}

// 绑定店铺排序控件
function bindShopSortControls(state) {
    $('#shop-search-controls .sort-btn').on('click', function() {
        const sort = $(this).data('sort');
        if (state.sort === sort) return;
        
        // 更新按钮状态
        $('#shop-search-controls .sort-btn').removeClass('active');
        $(this).addClass('active');
        
        state.sort = sort;
        const sorted = sortShops(state.shops, state.sort);
        renderShopResults(sorted);
    });
}

// 加载店铺商品
function loadShopProducts(shopId) {
    const $container = $(`#shop-products-${shopId}`);
    
    ajaxRequest(`/api/products?shop_id=${shopId}&limit=8`, 'GET', null,
        res => {
            const products = res.data || [];
            if (products.length === 0) {
                $container.html(`
                    <div class="text-center text-muted py-4">
                        <i class="bi bi-box"></i> 暂无商品
                    </div>
                `);
                return;
            }
            
            let html = '<div class="d-flex gap-3 shop-products-list">';
            products.forEach(product => {
                const img = product.image_url || '/images/product-default.svg';
                html += `
                    <div class="shop-product-item flex-shrink-0">
                        <a href="/product/${product.id}" class="text-decoration-none">
                            <div class="card border-0 shadow-sm" style="width: 120px;">
                                <img src="${img}" class="card-img-top" style="height: 120px; object-fit: cover;" alt="${product.name}" onerror="this.src='/images/product-default.svg'">
                                <div class="card-body p-2">
                                    <h6 class="card-title small mb-1" style="font-size: 0.75rem; line-height: 1.2; height: 2.4em; overflow: hidden;">${product.name}</h6>
                                    <div class="text-primary fw-bold small">¥${formatPrice(product.price)}</div>
                                </div>
                            </div>
                        </a>
                    </div>
                `;
            });
            html += '</div>';
            
            $container.html(html);
        },
        error => {
            $container.html(`
                <div class="text-center text-muted py-4">
                    <i class="bi bi-exclamation-triangle"></i> 加载失败
                </div>
            `);
        }
    );
}

