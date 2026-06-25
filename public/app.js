/**
 * ==========================================================================
 * NEXORA CLIENT SIDE ENGINE
 * World-class single-page interactive controller orchestrator
 * ==========================================================================
 */

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;

const safeStorage = {
    get(key) {
        try {
            return localStorage.getItem(key);
        } catch (err) {
            return null;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (err) { }
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (err) { }
    }
};

const appState = {
    user: null,
    token: null,
    products: [],
    cart: [],
    wishlist: [],
    recentlyViewed: [],
    currentView: 'hero-view',

    // Initialization logic
    init: function () {
        this.loadSession();
        this.bindEvents();
        this.trackSpotlight();
        this.loadProducts();
        this.renderCart();
    },

    loadSession: function () {
        const token = safeStorage.get('nexora_token');
        const userData = safeStorage.get('nexora_user');
        const savedCart = safeStorage.get('nexora_cart');

        if (token && userData) {
            this.token = token;
            this.user = JSON.parse(userData);
            this.wishlist = this.user.wishlist || [];
            this.toggleAdminConsoleAccess();
            this.fetchProfileTelemetry();
        }

        if (savedCart) {
            this.cart = JSON.parse(savedCart);
        }
    },

    saveSession: function (token, user) {
        this.token = token;
        this.user = user;
        this.wishlist = user.wishlist || [];
        safeStorage.set('nexora_token', token);
        safeStorage.set('nexora_user', JSON.stringify(user));
        this.toggleAdminConsoleAccess();
        this.fetchProfileTelemetry();
    },

    clearSession: function () {
        this.token = null;
        this.user = null;
        this.wishlist = [];
        safeStorage.remove('nexora_token');
        safeStorage.remove('nexora_user');
        this.toggleAdminConsoleAccess();
        this.renderProfile();
    },

    toggleAdminConsoleAccess: function () {
        const isAdmin = this.user && this.user.role === 'admin';
        document.querySelectorAll('.admin-only').forEach(el => {
            if (isAdmin) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
    },

    // Password visibility toggle handler
    setupPasswordToggle: function (toggleButtonId, inputId) {
        const toggleBtn = document.getElementById(toggleButtonId);
        const input = document.getElementById(inputId);

        if (toggleBtn && input) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (input.type === 'password') {
                    input.type = 'text';
                    toggleBtn.textContent = '🙈';
                } else {
                    input.type = 'password';
                    toggleBtn.textContent = '👁️';
                }
            });
        }
    },

    // View Routing Management
    navigateTo: function (viewId, productData = null) {
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.remove('active-panel');
            panel.style.display = 'none';
        });

        const activePanel = document.getElementById(viewId);
        if (activePanel) {
            activePanel.style.display = 'block';
            setTimeout(() => {
                activePanel.classList.add('active-panel');
            }, 50);
        }

        document.querySelectorAll('.nav-item, .drawer-link').forEach(link => {
            if (link.getAttribute('data-target') === viewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        this.currentView = viewId;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (viewId === 'profile-view') {
            this.renderProfile();
        } else if (viewId === 'admin-view') {
            this.loadAdminDashboard();
        } else if (viewId === 'product-detail-view' && productData) {
            this.renderProductDetails(productData);
        }
    },

    smoothScroll: function (elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    },

    // Mouse Spotlight effect dynamic mapping
    trackSpotlight: function () {
        const spotlight = document.getElementById('spotlight');
        if (!spotlight) return;

        window.addEventListener('mousemove', (e) => {
            spotlight.style.setProperty('--x', `${e.clientX}px`);
            spotlight.style.setProperty('--y', `${e.clientY}px`);
        });
    },

    // Global Events Router
    bindEvents: function () {
        // Navigation binds
        document.querySelectorAll('[data-target]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.getAttribute('data-target');
                this.navigateTo(target);
                const drawer = document.getElementById('mobile-drawer');
                if (drawer) drawer.classList.remove('active');
            });
        });

        // Hero buttons
        const exploreBtn = document.getElementById('explore-collection-btn');
        const arrivalsBtn = document.getElementById('new-arrivals-btn');

        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => {
                this.navigateTo('products-view');
            });
        }

        if (arrivalsBtn) {
            arrivalsBtn.addEventListener('click', () => {
                this.navigateTo('products-view');
            });
        }

        // Mobile drawer toggles
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const closeDrawerBtn = document.getElementById('close-drawer-btn');
        const mobileDrawer = document.getElementById('mobile-drawer');

        if (mobileMenuBtn && mobileDrawer) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileDrawer.classList.add('active');
            });
        }

        if (closeDrawerBtn && mobileDrawer) {
            closeDrawerBtn.addEventListener('click', () => {
                mobileDrawer.classList.remove('active');
            });
        }

        // Search features binds
        const searchInput = document.getElementById('global-search');
        const suggestionsBox = document.getElementById('suggestions-box');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchSuggestions(e.target.value));
            document.addEventListener('click', (e) => {
                if (
                    suggestionsBox &&
                    !searchInput.contains(e.target) &&
                    !suggestionsBox.contains(e.target)
                ) {
                    suggestionsBox.classList.add('hidden');
                }
            });
        }

        // Shopping Cart Dialog triggers
        const cartToggleBtn = document.getElementById('cart-toggle-btn');
        const closeCartBtn = document.getElementById('close-cart-btn');
        const cartCanvas = document.getElementById('shopping-cart-canvas');

        if (cartToggleBtn && cartCanvas) {
            cartToggleBtn.addEventListener('click', () => {
                cartCanvas.classList.toggle('active');
            });
        }

        if (closeCartBtn && cartCanvas) {
            closeCartBtn.addEventListener('click', () => {
                cartCanvas.classList.remove('active');
            });
        }

        // Filter operations binds
        document.querySelectorAll('[data-category-filter]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('[data-category-filter]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderProducts(tab.getAttribute('data-category-filter'));
            });
        });

        // Auth Form tabs
        const tabLoginBtn = document.getElementById('tab-login-btn');
        const tabRegisterBtn = document.getElementById('tab-register-btn');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (tabLoginBtn && tabRegisterBtn && loginForm && registerForm) {
            tabLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                tabLoginBtn.classList.add('active');
                tabRegisterBtn.classList.remove('active');
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            });

            tabRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                tabRegisterBtn.classList.add('active');
                tabLoginBtn.classList.remove('remove');
                tabLoginBtn.classList.remove('active');
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
            });
        }

        // Form Submit Actions
        document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form')?.addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('update-profile-form')?.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        document.getElementById('logout-btn')?.addEventListener('click', () => this.clearSession());

        // Password visibility toggle handlers
        this.setupPasswordToggle('toggle-login-password', 'login-password');
        this.setupPasswordToggle('toggle-reg-password', 'reg-password');

        // Admin forms mapping
        document.getElementById('admin-product-form')?.addEventListener('submit', (e) => this.handleAdminProductSubmit(e));
        document.getElementById('admin-cancel-edit-btn')?.addEventListener('click', () => this.resetAdminForm());

        // Checkouts Modal handles
        document.getElementById('proceed-checkout-btn')?.addEventListener('click', () => this.openCheckoutModal());
        document.getElementById('checkout-cancel-btn')?.addEventListener('click', () => {
            document.getElementById('checkout-modal')?.classList.add('hidden');
        });
        document.getElementById('checkout-form')?.addEventListener('submit', (e) => this.handleCheckout(e));

        // Newsletter form
        document.getElementById('newsletter-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.showNotification('Subscription feature coming soon', 'info');
        });

        // Footer links
        document.getElementById('footer-home-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('hero-view');
        });

        document.getElementById('footer-products-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('products-view');
        });

        document.getElementById('footer-account-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateTo('profile-view');
        });

        // Category Cards binds
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const category = card.getAttribute('data-category');
                this.navigateTo('products-view');
                const matchingTab = document.querySelector(`[data-category-filter="${category}"]`);
                if (matchingTab) matchingTab.click();
            });
        });
    },

    // Fetch Products Catalog from Database API
    loadProducts: async function () {
        try {
            const res = await fetch(`${API_BASE}/products`);
            const data = await res.json();
            if (data.success) {
                this.products = data.data;
                this.renderProducts('all');
            }
        } catch (err) {
            this.showNotification('Catalog loading down interface networks', 'error');
        }
    },

    renderProducts: function (filter = 'all') {
        const grid = document.getElementById('catalog-products-grid');
        if (!grid) return;

        grid.innerHTML = '';

        const itemsToDisplay = filter === 'all'
            ? this.products
            : this.products.filter(p => p.category === filter);

        if (itemsToDisplay.length === 0) {
            grid.innerHTML = '<p class="placeholder-text" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">No products available in this category.</p>';
            return;
        }

        itemsToDisplay.forEach(product => {
            const isWishlisted = this.wishlist.includes(product._id);
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image" style="background-image: url('${product.images[0]}')">
                    <button class="wishlist-heart-btn ${isWishlisted ? 'active' : ''}" data-id="${product._id}" aria-label="Add to wishlist">
                        <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </button>
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</div>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}</p>
                    <div class="product-footer">
                        <div class="product-price">$${product.price.toLocaleString()}</div>
                        <button class="product-action" data-id="${product._id}">View</button>
                    </div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.wishlist-heart-btn')) {
                    e.stopPropagation();
                    this.toggleWishlist(product._id, e.target.closest('.wishlist-heart-btn'));
                    return;
                }

                if (e.target.closest('.product-action')) {
                    e.stopPropagation();
                }

                this.navigateTo('product-detail-view', product);
            });

            grid.appendChild(card);
        });
    },

    // Direct Product details generation
    renderProductDetails: function (product) {
        const container = document.getElementById('product-details-container');
        if (!container) return;

        const isWishlisted = this.wishlist.includes(product._id);

        container.innerHTML = `
            <div class="product-detail-layout">
                <div class="product-detail-image">
                    <img src="${product.images[0]}" alt="${product.name}" class="product-detail-img">
                </div>
                <div class="product-detail-info">
                    <div class="product-detail-category">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</div>
                    <h1 class="product-detail-title">${product.name}</h1>
                    <div class="product-detail-price">$${product.price.toLocaleString()}</div>
                    <p class="product-detail-description">${product.description}</p>
                    <div class="product-detail-actions">
                        <button class="btn btn-primary" id="add-to-cart-action-btn">Add to Cart</button>
                        <button class="btn btn-secondary" id="wishlist-action-btn" data-id="${product._id}">
                            ${isWishlisted ? '❤️ Wishlist' : '♡ Wishlist'}
                        </button>
                        <button class="btn btn-secondary" id="back-to-catalog-btn">Back to Catalog</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('add-to-cart-action-btn')?.addEventListener('click', () => {
            this.addToCart(product);
        });

        document.getElementById('wishlist-action-btn')?.addEventListener('click', (e) => {
            this.toggleWishlist(product._id, e.target.closest('button'));
        });

        document.getElementById('back-to-catalog-btn')?.addEventListener('click', () => {
            this.navigateTo('products-view');
        });

        if (!this.recentlyViewed.some(p => p._id === product._id)) {
            this.recentlyViewed.unshift(product);
            if (this.recentlyViewed.length > 5) this.recentlyViewed.pop();
        }
    },

    // Search Engine handles
    handleSearchSuggestions: function (query) {
        const box = document.getElementById('suggestions-box');
        if (!box) return;

        if (!query) {
            box.classList.add('hidden');
            return;
        }

        const filtered = this.products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
        if (filtered.length === 0) {
            box.classList.add('hidden');
            return;
        }

        box.innerHTML = '';
        box.classList.remove('hidden');

        filtered.slice(0, 5).forEach(product => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerText = product.name;
            item.addEventListener('click', () => {
                this.navigateTo('product-detail-view', product);
                box.classList.add('hidden');
                const searchInput = document.getElementById('global-search');
                if (searchInput) searchInput.value = '';
            });
            box.appendChild(item);
        });
    },

    // Authentication Transactions Handles
    handleLogin: async function (e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success) {
                this.saveSession(data.token, data.user);
                this.showNotification('Credential clearance verified', 'success');
                this.renderProfile();
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (err) {
            this.showNotification('Identity authentication interface down', 'error');
        }
    },

    handleRegister: async function (e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (data.success) {
                this.saveSession(data.token, data.user);
                this.showNotification('Account credentials constructed', 'success');
                this.renderProfile();
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (err) {
            this.showNotification('Database profile creation processing error', 'error');
        }
    },

    handleProfileUpdate: async function (e) {
        e.preventDefault();
        const name = document.getElementById('update-name').value;
        const email = document.getElementById('update-email').value;

        try {
            const res = await fetch(`${API_BASE}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ name, email })
            });
            const data = await res.json();
            if (data.success) {
                this.user = { ...this.user, name: data.data.name, email: data.data.email };
                safeStorage.set('nexora_user', JSON.stringify(this.user));
                this.showNotification('Account matrix updated successfully', 'success');
                this.renderProfile();
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (err) {
            this.showNotification('Critical telemetry transaction down', 'error');
        }
    },

    fetchProfileTelemetry: async function () {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (data.success) {
                this.user = data.data;
                this.wishlist = data.data.wishlist.map(p => p._id || p);
                safeStorage.set('nexora_user', JSON.stringify(this.user));
            }
        } catch (err) {
            console.log('Unable to sync profile telemetry states');
        }
    },

    renderProfile: function () {
        const authBox = document.getElementById('auth-box-wrapper');
        const profileBox = document.getElementById('user-profile-wrapper');

        if (!authBox || !profileBox) return;

        if (!this.token) {
            authBox.classList.remove('hidden');
            profileBox.classList.add('hidden');
            return;
        }

        authBox.classList.add('hidden');
        profileBox.classList.remove('hidden');

        document.getElementById('profile-user-name').innerText = this.user.name;
        document.getElementById('profile-user-email').innerText = this.user.email;
        document.getElementById('profile-user-role').innerText = this.user.role === 'admin'
            ? 'SYSTEM ADMINISTRATOR'
            : 'PLATINUM COMMISSIONS MEMBER';

        document.getElementById('update-name').value = this.user.name;
        document.getElementById('update-email').value = this.user.email;

        this.renderOrdersHistory();
        this.renderWishlist();
    },

    toggleWishlist: async function (productId, btnElement) {
        if (!this.token) {
            this.showNotification('Authentication credentials required', 'info');
            this.navigateTo('profile-view');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/wishlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ productId })
            });
            const data = await res.json();
            if (data.success) {
                this.wishlist = data.wishlist;
                if (btnElement) btnElement.classList.toggle('active');
                this.showNotification('Wishlist profile synchronized', 'success');
                this.fetchProfileTelemetry();
            }
        } catch (err) {
            this.showNotification('Failed to toggle product wishlist configurations', 'error');
        }
    },

    renderWishlist: function () {
        const container = document.getElementById('wishlist-container');
        if (!container || !this.user) return;

        container.innerHTML = '';

        if (!this.user.wishlist || this.user.wishlist.length === 0) {
            container.innerHTML = '<p class="placeholder-text">Wishlist currently empty.</p>';
            return;
        }

        this.user.wishlist.forEach(product => {
            const item = document.createElement('div');
            item.className = 'order-item-card';
            item.innerHTML = `
                <div>
                    <strong>${product.name}</strong>
                    <div style="color: var(--gold-primary);">$${product.price.toLocaleString()}</div>
                </div>
                <button class="btn btn-secondary btn-small">Aquire</button>
            `;
            item.querySelector('button')?.addEventListener('click', () => {
                this.navigateTo('product-detail-view', product);
            });
            container.appendChild(item);
        });
    },

    renderOrdersHistory: async function () {
        const container = document.getElementById('orders-history-container');
        if (!container) return;

        container.innerHTML = '<p class="placeholder-text">Syncing historical tracking configurations...</p>';

        try {
            const res = await fetch(`${API_BASE}/orders/myorders`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                container.innerHTML = '';
                data.data.forEach(order => {
                    const card = document.createElement('div');
                    card.className = 'order-item-card';
                    card.innerHTML = `
                        <div class="order-meta-info">
                            <div>Commission Code: <span class="id-tag">${order._id}</span></div>
                            <div style="color: var(--text-muted);">${new Date(order.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div>
                            <span class="order-status-badge status-${order.status.toLowerCase()}">${order.status}</span>
                            <div style="text-align: right; margin-top: 5px; font-weight: 700;">$${order.totalPrice.toLocaleString()}</div>
                        </div>
                    `;
                    container.appendChild(card);
                });
            } else {
                container.innerHTML = '<p class="placeholder-text">No commissions established on this system session.</p>';
            }
        } catch (err) {
            container.innerHTML = '<p class="placeholder-text">Telemetry history interface unavailable.</p>';
        }
    },

    // Integrated Checkout and Shopping Cart systems
    addToCart: function (product) {
        const existing = this.cart.find(item => item.product._id === product._id);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.cart.push({ product, quantity: 1 });
        }
        this.saveCart();
        this.showNotification('Item positioned in acquisitions pipeline', 'success');
        document.getElementById('shopping-cart-canvas')?.classList.add('active');
    },

    removeFromCart: function (productId) {
        this.cart = this.cart.filter(item => item.product._id !== productId);
        this.saveCart();
        this.renderCart();
    },

    updateCartQuantity: function (productId, delta) {
        const item = this.cart.find(i => i.product._id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                this.removeFromCart(productId);
                return;
            }
        }
        this.saveCart();
    },

    saveCart: function () {
        safeStorage.set('nexora_cart', JSON.stringify(this.cart));
        this.renderCart();
    },

    renderCart: function () {
        const container = document.getElementById('cart-items-container');
        const badge = document.getElementById('cart-badge');
        const subtotalEl = document.getElementById('cart-subtotal-price');

        if (!container || !badge || !subtotalEl) return;

        container.innerHTML = '';

        let subtotal = 0;
        let totalCount = 0;

        if (this.cart.length === 0) {
            container.innerHTML = '<p class="placeholder-text">Your acquisitions list is currently empty.</p>';
            badge.classList.add('hidden');
            subtotalEl.innerText = '$0.00';
            return;
        }

        this.cart.forEach(item => {
            subtotal += item.product.price * item.quantity;
            totalCount += item.quantity;

            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <img src="${item.product.images[0]}" alt="${item.product.name}">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.product.name}</div>
                    <div class="cart-item-price">$${(item.product.price * item.quantity).toLocaleString()}</div>
                    <div class="cart-item-qty-actions">
                        <button class="qty-btn" data-action="decrease" data-id="${item.product._id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" data-action="increase" data-id="${item.product._id}">+</button>
                    </div>
                    <button class="remove-cart-item-btn" data-action="remove" data-id="${item.product._id}">Remove Unit</button>
                </div>
            `;

            div.querySelector('[data-action="decrease"]')?.addEventListener('click', () => {
                this.updateCartQuantity(item.product._id, -1);
            });

            div.querySelector('[data-action="increase"]')?.addEventListener('click', () => {
                this.updateCartQuantity(item.product._id, 1);
            });

            div.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
                this.removeFromCart(item.product._id);
            });

            container.appendChild(div);
        });

        badge.innerText = totalCount;
        badge.classList.remove('hidden');
        subtotalEl.innerText = `$${subtotal.toLocaleString()}`;
    },

    openCheckoutModal: function () {
        if (!this.token) {
            this.showNotification('Identity authentication required before checkout systems release', 'info');
            this.navigateTo('profile-view');
            document.getElementById('shopping-cart-canvas')?.classList.remove('active');
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        document.getElementById('checkout-order-total').innerText = `$${total.toLocaleString()}`;
        document.getElementById('checkout-modal')?.classList.remove('hidden');
    },

    handleCheckout: async function (e) {
        e.preventDefault();
        const street = document.getElementById('ship-street').value;
        const city = document.getElementById('ship-city').value;
        const postalCode = document.getElementById('ship-postal').value;
        const country = document.getElementById('ship-country').value;

        const orderData = {
            products: this.cart.map(item => ({ product: item.product._id, quantity: item.quantity })),
            shippingAddress: { street, city, postalCode, country }
        };

        try {
            const res = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(orderData)
            });
            const data = await res.json();
            if (data.success) {
                this.cart = [];
                this.saveCart();
                document.getElementById('checkout-modal')?.classList.add('hidden');
                document.getElementById('shopping-cart-canvas')?.classList.remove('active');
                this.showNotification('Commission transaction initiated successfully', 'success');
                this.navigateTo('profile-view');
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (err) {
            this.showNotification('Direct database transactional pipeline failing', 'error');
        }
    },

    // Admin Console telemetry and operational interfaces
    loadAdminDashboard: async function () {
        try {
            const authHeaders = { 'Authorization': `Bearer ${this.token}` };

            const analyticsRes = await fetch(`${API_BASE}/admin/analytics`, { headers: authHeaders });
            const analytics = await analyticsRes.json();

            if (analytics.success) {
                document.getElementById('analytic-revenue').innerText = `$${analytics.data.revenue.toLocaleString()}`;
                document.getElementById('analytic-users').innerText = analytics.data.users;
                document.getElementById('analytic-products').innerText = analytics.data.products;
                document.getElementById('analytic-orders').innerText = analytics.data.orders;
            }

            this.renderAdminProducts();
            this.renderAdminOrders();
        } catch (err) {
            this.showNotification('Console operations tracking lost telemetry links', 'error');
        }
    },

    renderAdminProducts: async function () {
        try {
            const res = await fetch(`${API_BASE}/products`);
            const data = await res.json();
            const tableBody = document.getElementById('admin-inventory-table-body');
            if (!tableBody) return;

            tableBody.innerHTML = '';

            if (data.success) {
                data.data.forEach(product => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${product.name}</strong></td>
                        <td>${product.category}</td>
                        <td>$${product.price.toLocaleString()}</td>
                        <td>${product.stock} units</td>
                        <td>
                            <button class="admin-action-btn" data-action="edit" data-id="${product._id}">Edit</button>
                            <button class="admin-action-btn admin-action-delete" data-action="delete" data-id="${product._id}">Delete</button>
                        </td>
                    `;

                    tr.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
                        this.editAdminProduct(product._id);
                    });

                    tr.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
                        this.deleteAdminProduct(product._id);
                    });

                    tableBody.appendChild(tr);
                });
            }
        } catch (err) {
            console.log('Admin inventory sync failure');
        }
    },

    renderAdminOrders: async function () {
        try {
            const res = await fetch(`${API_BASE}/admin/orders`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            const tableBody = document.getElementById('admin-orders-table-body');
            if (!tableBody) return;

            tableBody.innerHTML = '';

            if (data.success) {
                data.data.forEach(order => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><span class="id-tag">${order._id}</span></td>
                        <td>${order.user ? order.user.name : 'Unknown'}</td>
                        <td>$${order.totalPrice.toLocaleString()}</td>
                        <td><span class="order-status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                        <td>
                            <select class="admin-order-status-select" data-id="${order._id}" style="padding: 4px; background: rgba(0,0,0,0.5); color:#fff; border:1px solid rgba(255,255,255,0.1)">
                                <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                                <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                    `;

                    tr.querySelector('.admin-order-status-select')?.addEventListener('change', (e) => {
                        this.updateOrderStatus(order._id, e.target.value);
                    });

                    tableBody.appendChild(tr);
                });
            }
        } catch (err) {
            console.log('Unable to load administration telemetry');
        }
    },

    handleAdminProductSubmit: async function (e) {
        e.preventDefault();
        const id = document.getElementById('admin-p-id').value;
        const name = document.getElementById('admin-p-name').value;
        const category = document.getElementById('admin-p-category').value;
        const price = parseFloat(document.getElementById('admin-p-price').value);
        const images = [document.getElementById('admin-p-image').value || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'];
        const stock = parseInt(document.getElementById('admin-p-stock').value);
        const description = document.getElementById('admin-p-description').value;

        const payload = { name, category, price, images, stock, description };
        const url = id ? `${API_BASE}/admin/products/${id}` : `${API_BASE}/admin/products`;
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                this.showNotification('Inventory database updated', 'success');
                this.resetAdminForm();
                this.loadAdminDashboard();
                this.loadProducts();
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (err) {
            this.showNotification('Product manipulation transaction failed', 'error');
        }
    },

    editAdminProduct: function (productId) {
        const product = this.products.find(p => p._id === productId);
        if (!product) return;

        document.getElementById('admin-p-id').value = product._id;
        document.getElementById('admin-p-name').value = product.name;
        document.getElementById('admin-p-category').value = product.category;
        document.getElementById('admin-p-price').value = product.price;
        document.getElementById('admin-p-image').value = product.images[0];
        document.getElementById('admin-p-stock').value = product.stock;
        document.getElementById('admin-p-description').value = product.description;

        document.getElementById('product-form-action-title').innerText = 'Modify Curated Specs';
        document.getElementById('admin-submit-btn').innerText = 'Authorize Updates';
        document.getElementById('admin-cancel-edit-btn').classList.remove('hidden');
    },

    deleteAdminProduct: async function (productId) {
        if (!confirm('Are you absolute in deleting this commission listing?')) return;

        try {
            const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (data.success) {
                this.showNotification('Asset removed from database registries', 'success');
                this.loadAdminDashboard();
                this.loadProducts();
            }
        } catch (err) {
            this.showNotification('Deletion operation failed', 'error');
        }
    },

    updateOrderStatus: async function (orderId, status) {
        try {
            const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                this.showNotification('Shipment pipeline parameters updated', 'success');
                this.loadAdminDashboard();
            }
        } catch (err) {
            this.showNotification('Status adjustment pipeline blocked', 'error');
        }
    },

    resetAdminForm: function () {
        document.getElementById('admin-p-id').value = '';
        document.getElementById('admin-product-form').reset();
        document.getElementById('product-form-action-title').innerText = 'Inventory Curation';
        document.getElementById('admin-submit-btn').innerText = 'Publish Item';
        document.getElementById('admin-cancel-edit-btn').classList.add('hidden');
    },

    // Premium micro-interactivity Notification Service
    showNotification: function (message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderLeftColor =
            type === 'success'
                ? 'var(--color-success)'
                : type === 'error'
                    ? 'var(--color-error)'
                    : 'var(--gold-primary)';

        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <span class="toast-close">&times;</span>
        `;

        toast.querySelector('.toast-close')?.addEventListener('click', () => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        });

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }
};

// Start system orchestration on DOM trigger
document.addEventListener('DOMContentLoaded', () => {
    appState.init();
});
