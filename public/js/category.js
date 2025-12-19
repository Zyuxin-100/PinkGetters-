// 分类详情页逻辑
$(document).ready(function() {
    const categoryId = $('main').data('category-id');
    if (!categoryId) return;

    const state = {
        sort: 'new',
        filters: {
            priceMin: null,
            priceMax: null,
            inStock: false,
            ratingMin: null
        },
        products: []
    };

    // 默认排序加载
    setActiveSort('new');
    loadCategoryProducts(categoryId, state.sort, state);

    // 排序切换：按钮排成一排
    $('.sort-btn').on('click', function() {
        const sort = $(this).data('sort');
        if (state.sort === sort) return;
        setActiveSort(sort);
        state.sort = sort;
        loadCategoryProducts(categoryId, state.sort, state);
    });

    // 筛选应用
    $('#filter-apply').on('click', function() {
        state.filters = readFilters();
        renderWithFilters(state);
        closeFilterDropdown();
    });

    // 筛选重置
    $('#filter-reset').on('click', function() {
        $('#filter-price-min').val('');
        $('#filter-price-max').val('');
        $('#filter-rating').val('');
        $('#filter-instock').prop('checked', false);
        state.filters = { priceMin: null, priceMax: null, inStock: false, ratingMin: null };
        renderWithFilters(state);
    });
});

function setActiveSort(sort) {
    $('.sort-btn').removeClass('active');
    $(`.sort-btn[data-sort="${sort}"]`).addClass('active');
}

function closeFilterDropdown() {
    const dropdownToggle = document.getElementById('btn-filter');
    if (!dropdownToggle || typeof bootstrap === 'undefined') return;
    const inst = bootstrap.Dropdown.getInstance(dropdownToggle);
    if (inst) inst.hide();
}

function readFilters() {
    const minVal = parseFloat($('#filter-price-min').val());
    const maxVal = parseFloat($('#filter-price-max').val());
    const ratingVal = parseFloat($('#filter-rating').val());
    return {
        priceMin: Number.isFinite(minVal) ? minVal : null,
        priceMax: Number.isFinite(maxVal) ? maxVal : null,
        inStock: $('#filter-instock').is(':checked'),
        ratingMin: Number.isFinite(ratingVal) ? ratingVal : null
    };
}

function renderWithFilters(state) {
    const $container = $('#category-products');
    const filtered = applyFilters(state.products, state.filters);
    renderCategoryProducts(filtered, $container);
}

function loadCategoryProducts(categoryId, sort, state) {
    const $container = $('#category-products');
    const { sortField, sortOrder, clientSort } = mapSort(sort);

    // 调试：打印要请求的 URL
    const apiUrl = `/api/products?category_id=${categoryId}&sort=${sortField}&order=${sortOrder}&limit=40`;
    console.debug('[category] loading products for category', categoryId, 'url=', apiUrl);

    ajaxRequest(apiUrl, 'GET', null,
        function(response) {
            try {
                console.debug('[category] products response:', response);
                let products = response.data || [];

                // 客户端排序（如销量、评分）在拉取后处理
                if (clientSort === 'sold_desc') {
                    products = products.slice().sort((a, b) => (b.sold || 0) - (a.sold || 0));
                } else if (clientSort === 'rating_desc') {
                    products = products.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
                }

                state.products = products;
                renderWithFilters(state);
            } catch (err) {
                console.error('[category] render error', err);
                $container.html(`<div class="col-12 text-danger">渲染商品时出错</div>`);
            }
        },
        function(message) {
            console.warn('[category] load products error:', message);
            $container.html(`<div class="col-12 text-danger">${message}</div>`);
        }
    );
}

function mapSort(sort) {
    switch (sort) {
        case 'sold_desc':
            return { clientSort: 'sold_desc', sortField: 'created_at', sortOrder: 'DESC' };
        case 'rating_desc':
            return { clientSort: 'rating_desc', sortField: 'created_at', sortOrder: 'DESC' };
        case 'price_asc':
            return { sortField: 'price', sortOrder: 'ASC' };
        case 'price_desc':
            return { sortField: 'price', sortOrder: 'DESC' };
        case 'new_desc':
            return { sortField: 'created_at', sortOrder: 'DESC' };
        case 'new':
        default:
            return { sortField: 'created_at', sortOrder: 'DESC' };
    }
}

function applyFilters(products, filters) {
    return (products || []).filter(p => {
        if (filters.inStock && (!Number.isFinite(p.stock) || p.stock <= 0)) return false;
        if (filters.priceMin !== null && Number(p.price) < filters.priceMin) return false;
        if (filters.priceMax !== null && Number(p.price) > filters.priceMax) return false;
        if (filters.ratingMin !== null && (!p.rating || p.rating < filters.ratingMin)) return false;
        return true;
    });
}

function renderCategoryProducts(products, $container) {
    if (products.length === 0) {
        $container.html(`
            <div class="col-12 text-center py-5">
                <i class="bi bi-inbox" style="font-size: 4rem; color: var(--primary-light);"></i>
                <p class="text-muted mt-3">该分类暂无商品</p>
            </div>
        `);
        return;
    }

    let html = '<div class="row g-4">';
    products.forEach(product => {
        // 真正图片
        const imgSrc = product.image_url;

        html += `
            <div class="col-6 col-sm-4 col-md-3 col-lg-2-4" role="listitem">
                <a href="/product/${product.id}" class="product-card-link" aria-label="查看 ${product.name}">
                    <article class="card product-card h-100">
                        <div class="product-image-wrap">
                            <img src="${imgSrc}" 
                                 class="card-img-top product-image" 
                                 alt="${(product.name||'商品').replace(/"/g,'') }"
                                 onerror="this.onerror=null;this.src='/images/product-default.svg'">
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text">${product.description || '优质商品，值得拥有'}</p>
                            <div class="d-flex align-items-center gap-2 mt-auto">
                                <span class="product-price">${formatPrice(product.price)}</span>
                            </div>
                        </div>
                    </article>
                </a>
            </div>
        `;
    });
    html += '</div>';

    $container.html(html);
}

