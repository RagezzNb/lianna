// SEPHYX - Cryptic Drip Terminal
// Main JavaScript File

class SephyxApp {
    constructor() {
        this.currentUser = null;
        this.cart = [];
        this.wishlist = [];
        this.products = [];
        this.isLoading = true;
        this.currentSlide = 0;
        this.carouselInterval = null;
        this.musicEnabled = localStorage.getItem('sephyx_music') !== 'false';
        this.vaultUnlocked = localStorage.getItem('sephyx_vault_unlocked') === 'true';
        
        this.init();
    }

    async init() {
        this.loadUserSession();
        this.initializeProducts();
        this.setupEventListeners();
        this.startLoadingSequence();
        this.loadCart();
        this.loadWishlist();
        this.setupEasterEggs();
        this.initChatbot();
        this.showRandomTerminalMessage();
    }

    // Loading and Initialization
    startLoadingSequence() {
        const loadingScreen = document.getElementById('loading-screen');
        const progress = document.querySelector('.loading-progress');
        
        let percent = 0;
        const interval = setInterval(() => {
            percent += Math.random() * 15;
            if (percent >= 100) {
                percent = 100;
                clearInterval(interval);
                setTimeout(() => this.showPuzzle(), 500);
            }
            progress.style.width = percent + '%';
        }, 100);
    }

    showPuzzle() {
        const puzzleContainer = document.getElementById('puzzle-container');
        const puzzleInput = document.getElementById('puzzle-input');
        
        puzzleContainer.style.display = 'block';
        puzzleInput.focus();
        
        puzzleInput.addEventListener('keyup', (e) => {
            if (e.target.value.toLowerCase() === '4202') { // 2024 backwards
                this.addXP(50, 'Solved access puzzle');
                this.completeLoading();
            }
        });

        // Auto-complete after 10 seconds
        setTimeout(() => {
            if (this.isLoading) {
                this.completeLoading();
            }
        }, 10000);
    }

    completeLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            this.isLoading = false;
            this.startCarousel();
            this.initMusic();
        }, 500);
    }

    // User Management
    loadUserSession() {
        const session = localStorage.getItem('sephyx_session');
        if (session) {
            this.currentUser = JSON.parse(session);
            this.updateUserDisplay();
            this.trackVisit();
        }
    }

    async registerUser(username, password) {
        const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
        
        if (users.find(u => u.username === username)) {
            throw new Error('Username already exists');
        }

        const hashedPassword = await this.hashPassword(password);
        const user = {
            id: Date.now(),
            username,
            password: hashedPassword,
            rank: 'INITIATE',
            xp: 0,
            visits: 1,
            timeSpent: 0,
            joinDate: new Date().toISOString(),
            vaultAccess: false
        };

        users.push(user);
        localStorage.setItem('sephyx_users', JSON.stringify(users));
        
        this.currentUser = user;
        localStorage.setItem('sephyx_session', JSON.stringify(user));
        this.updateUserDisplay();
        this.addXP(100, 'Welcome to SEPHYX');
        
        return user;
    }

    async loginUser(username, password) {
        const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
        const hashedPassword = await this.hashPassword(password);
        
        const user = users.find(u => u.username === username && u.password === hashedPassword);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        this.currentUser = user;
        localStorage.setItem('sephyx_session', JSON.stringify(user));
        this.updateUserDisplay();
        this.trackVisit();
        
        return user;
    }

    logoutUser() {
        this.saveTimeSpent();
        localStorage.removeItem('sephyx_session');
        this.currentUser = null;
        this.updateUserDisplay();
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'sephyx_salt');
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    updateUserDisplay() {
        const authBtn = document.getElementById('auth-btn');
        const userInfo = document.getElementById('user-info');
        const vaultLink = document.querySelector('.vault-link');

        if (this.currentUser) {
            authBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            document.getElementById('user-name').textContent = this.currentUser.username;
            document.getElementById('user-rank').textContent = this.currentUser.rank;
            
            if (this.currentUser.vaultAccess || this.vaultUnlocked) {
                vaultLink.style.display = 'block';
            }
        } else {
            authBtn.style.display = 'block';
            userInfo.style.display = 'none';
            vaultLink.style.display = 'none';
        }
    }

    // XP and Ranking System
    addXP(amount, reason) {
        if (!this.currentUser) return;

        this.currentUser.xp += amount;
        this.updateRank();
        this.saveUserData();
        this.showTerminalMessage(`+${amount} XP: ${reason}`);
    }

    updateRank() {
        const xp = this.currentUser.xp;
        let newRank = 'INITIATE';
        
        if (xp >= 1000) newRank = 'NEON THIEF';
        else if (xp >= 500) newRank = 'CYBER GHOST';
        else if (xp >= 200) newRank = 'DATA RUNNER';
        else if (xp >= 100) newRank = 'TERMINAL USER';

        if (newRank !== this.currentUser.rank) {
            this.currentUser.rank = newRank;
            this.showTerminalMessage(`RANK UPGRADE: ${newRank}`);
            
            if (newRank === 'NEON THIEF') {
                this.unlockVault();
            }
        }
    }

    saveUserData() {
        const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
        const index = users.findIndex(u => u.id === this.currentUser.id);
        if (index !== -1) {
            users[index] = this.currentUser;
            localStorage.setItem('sephyx_users', JSON.stringify(users));
            localStorage.setItem('sephyx_session', JSON.stringify(this.currentUser));
        }
    }

    trackVisit() {
        if (!this.currentUser) return;
        
        this.currentUser.visits++;
        this.currentUser.lastVisit = new Date().toISOString();
        this.startTimeTracking();
        this.saveUserData();
    }

    startTimeTracking() {
        this.sessionStart = Date.now();
        
        setInterval(() => {
            if (this.currentUser) {
                this.saveTimeSpent();
            }
        }, 30000); // Save every 30 seconds
    }

    saveTimeSpent() {
        if (!this.currentUser || !this.sessionStart) return;
        
        const timeSpent = Math.floor((Date.now() - this.sessionStart) / 1000);
        this.currentUser.timeSpent += timeSpent;
        this.sessionStart = Date.now();
        this.saveUserData();
    }

    // Product Management
    initializeProducts() {
        const savedProducts = localStorage.getItem('sephyx_products');
        if (savedProducts) {
            this.products = JSON.parse(savedProducts);
        } else {
            this.products = this.getDefaultProducts();
            this.saveProducts();
        }
        this.renderProducts();
    }

    getDefaultProducts() {
        return [
            {
                id: 1,
                title: "NEON INFILTRATOR HOODIE",
                price: 89.99 QAR,
                rarity: "rare",
                style: "hoodie",
                stock: 12,
                image: "https://pixabay.com/get/g3b1d3e03feb027293737fb92760ae935317c938e794c1ed14ad9a7d40189f6ed7fc85a5e5c20fe0e23560ef7cdaf05f6b8c046c38fa65642f84b887c16e629f3_1280.jpg",
                description: "Neural mesh integrated hoodie with reactive LED fibers"
            },
            {
                id: 2,
                title: "GHOST PROTOCOL JACKET",
                price: 149,
                rarity: "legendary",
                style: "jacket",
                stock: 8,
                image: "https://pixabay.com/get/ga4d739d1696c5d92ac99e3e36c22a50984c19d55bb0a6021ca3376e882cd31b38e65898cfa1d71921430e6c5db8c98615f4323789e29b301e101335aadd46798_1280.jpg",
                description: "Stealth technology embedded tactical jacket"
            },
            {
                id: 3,
                title: "VOID RUNNER TEE",
                price: 45,
                rarity: "common",
                style: "tee",
                stock: 25,
                image: "https://pixabay.com/get/g13979d0b55420222bb2ad144292a03b1277fc5b9c326e53a9388e941df2029b3abac19c426434eadf4acd2763419ee9902027dc2759af9c7eb5a100554a91ff8_1280.jpg",
                description: "Quantum fiber t-shirt with holographic print"
            },
            {
                id: 4,
                title: "CHROME DYNASTY MASK",
                price: 67,
                rarity: "rare",
                style: "accessory",
                stock: 15,
                image: "https://pixabay.com/get/g594be45aa8818b54b2d62add3e7e92962e42fa972eba24c88ec3aad47cdf83cb6326d97cbc45e384a7d7d23d2453041d57cdeda93e6d3a5a8d1bbd4bd1ed41d3_1280.jpg",
                description: "Reflective chrome face protection with air filtration"
            },
            {
                id: 5,
                title: "DIGITAL PROPHET GLOVES",
                price: 38,
                rarity: "common",
                style: "accessory",
                stock: 30,
                image: "https://pixabay.com/get/gbd6ae2d2ce61e7d86a5c1c83a1e1560d72c0c5b9965f0e89790691304fb21d324d6da9d99d6bf362fbd685e7cb02013fb6440a54c1ee7d29d65ad49888e9431d_1280.jpg",
                description: "Conductive fingerprint gloves for device interaction"
            },
            {
                id: 6,
                title: "NEON SAMURAI COAT",
                price: 199,
                rarity: "mythic",
                style: "jacket",
                stock: 3,
                image: "https://pixabay.com/get/gbb2fce0e8fc81ebfb09c8218f080f931433f5db183bad1a7d1a14e69910d9fb03f2ca44f561c875efa9f0f1627baa120b24ad8868ed26d5de94d12e3a9f91882_1280.jpg",
                description: "Limited edition ceremonial coat with smart fabric technology"
            },
            {
                id: 7,
                title: "CYBER PUNK BOOTS",
                price: 125,
                rarity: "legendary",
                style: "accessory",
                stock: 6,
                image: "https://pixabay.com/get/g55e033d5c3ba2dc36b718ecc18cc9a3dac086da18ee71b5492a473e1e6755b9a01a90c104d530a3b734e3aa6356859658cf018c48e1a1c77c1bfeb7d316cd9a6_1280.jpg",
                description: "Shock-absorbing boots with LED sole lighting"
            },
            {
                id: 8,
                title: "MATRIX RUNNER HOODIE",
                price: 95,
                rarity: "rare",
                style: "hoodie",
                stock: 18,
                image: "https://pixabay.com/get/ge3358cf5cc06426d5f731f169eb3c1567e58f6676f24b66e2a730d74e9bc8acd85b5b27c7d6ffcc60f441cb035e310d713b260544f05c02968b3c5ccae241ca3_1280.jpg",
                description: "Code-pattern hoodie with augmented reality markers"
            }
        ];
    }

    saveProducts() {
        localStorage.setItem('sephyx_products', JSON.stringify(this.products));
    }

    renderProducts() {
        const grid = document.getElementById('product-grid');
        if (!grid) return;

        grid.innerHTML = '';
        
        let filteredProducts = [...this.products];
        
        // Apply filters
        const styleFilter = document.getElementById('style-filter')?.value;
        const rarityFilter = document.getElementById('rarity-filter')?.value;
        const priceFilter = document.getElementById('price-filter')?.value;

        if (styleFilter) {
            filteredProducts = filteredProducts.filter(p => p.style === styleFilter);
        }
        
        if (rarityFilter) {
            filteredProducts = filteredProducts.filter(p => p.rarity === rarityFilter);
        }
        
        if (priceFilter) {
            const [min, max] = priceFilter.split('-').map(p => p.replace('+', ''));
            filteredProducts = filteredProducts.filter(p => {
                if (max) {
                    return p.price >= parseInt(min) && p.price <= parseInt(max);
                } else {
                    return p.price >= parseInt(min);
                }
            });
        }

        filteredProducts.forEach(product => {
            const card = this.createProductCard(product);
            grid.appendChild(card);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const stockClass = product.stock === 0 ? 'stock-out' : 
                          product.stock <= 5 ? 'stock-low' : '';
        
        const isInWishlist = this.wishlist.includes(product.id);
        
        card.innerHTML = `
            <img src="${product.image}" alt="${product.title}" class="product-image">
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <div class="product-price">$${product.price}</div>
                <div class="product-rarity rarity-${product.rarity}">${product.rarity}</div>
                <div class="product-stock ${stockClass}">
                    ${product.stock === 0 ? 'SOLD OUT' : 
                      product.stock <= 5 ? `ONLY ${product.stock} LEFT` : 
                      `${product.stock} IN STOCK`}
                </div>
                <div class="product-actions">
                    <button class="add-to-cart" data-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>
                        ${product.stock === 0 ? 'SOLD OUT' : 'ADD TO VAULT'}
                    </button>
                    <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" data-id="${product.id}" title="Add to Wishlist">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    // Cart Management
    loadCart() {
        const savedCart = localStorage.getItem('sephyx_cart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
            this.updateCartDisplay();
        }
    }

    saveCart() {
        localStorage.setItem('sephyx_cart', JSON.stringify(this.cart));
    }

    // Wishlist Management
    loadWishlist() {
        const savedWishlist = localStorage.getItem('sephyx_wishlist');
        this.wishlist = savedWishlist ? JSON.parse(savedWishlist) : [];
        this.updateWishlistDisplay();
    }

    saveWishlist() {
        localStorage.setItem('sephyx_wishlist', JSON.stringify(this.wishlist));
        this.updateWishlistDisplay();
    }

    addToWishlist(productId) {
        if (!this.wishlist.includes(productId)) {
            this.wishlist.push(productId);
            this.saveWishlist();
            this.showTerminalMessage(`Item added to wishlist`);
        } else {
            this.showTerminalMessage(`Item already in wishlist`);
        }
    }

    removeFromWishlist(productId) {
        const index = this.wishlist.indexOf(productId);
        if (index > -1) {
            this.wishlist.splice(index, 1);
            this.saveWishlist();
            this.showTerminalMessage(`Item removed from wishlist`);
        }
    }

    updateWishlistDisplay() {
        const wishlistBtn = document.getElementById('wishlist-btn');
        const wishlistCount = document.getElementById('wishlist-count');
        
        if (wishlistBtn && wishlistCount) {
            wishlistCount.textContent = this.wishlist.length;
            wishlistCount.style.display = this.wishlist.length > 0 ? 'flex' : 'none';
        }
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || product.stock === 0) return;

        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                existingItem.quantity++;
            } else {
                this.showTerminalMessage('Maximum stock reached for this item');
                return;
            }
        } else {
            this.cart.push({
                id: productId,
                title: product.title,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }

        // Reduce stock
        product.stock--;
        this.saveProducts();
        this.renderProducts();
        this.saveCart();
        this.updateCartDisplay();
        this.addXP(10, 'Added item to vault');
        this.showTerminalMessage(`Added ${product.title} to vault`);
    }

    removeFromCart(productId) {
        const cartIndex = this.cart.findIndex(item => item.id === productId);
        if (cartIndex === -1) return;

        const cartItem = this.cart[cartIndex];
        const product = this.products.find(p => p.id === productId);
        
        if (product) {
            product.stock += cartItem.quantity;
            this.saveProducts();
            this.renderProducts();
        }

        this.cart.splice(cartIndex, 1);
        this.saveCart();
        this.updateCartDisplay();
        this.renderCartItems();
    }

    updateCartQuantity(productId, newQuantity) {
        const cartItem = this.cart.find(item => item.id === productId);
        const product = this.products.find(p => p.id === productId);
        
        if (!cartItem || !product) return;

        const difference = newQuantity - cartItem.quantity;
        
        if (difference > 0 && product.stock < difference) {
            this.showTerminalMessage('Not enough stock available');
            return;
        }

        if (newQuantity <= 0) {
            this.removeFromCart(productId);
            return;
        }

        product.stock -= difference;
        cartItem.quantity = newQuantity;
        
        this.saveProducts();
        this.saveCart();
        this.renderProducts();
        this.updateCartDisplay();
        this.renderCartItems();
    }

    updateCartDisplay() {
        const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cart-count').textContent = count;
    }

    renderCartItems() {
        const container = document.getElementById('cart-items');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = '<div class="empty-cart">Your vault is empty</div>';
            document.getElementById('cart-total').textContent = '0';
            return;
        }

        container.innerHTML = '';
        let total = 0;

        this.cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.title}" class="cart-item-image">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">$${item.price}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="app.updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="app.updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    <button class="remove-item" onclick="app.removeFromCart(${item.id})">REMOVE</button>
                </div>
            `;
            container.appendChild(itemElement);
            total += item.price * item.quantity;
        });

        document.getElementById('cart-total').textContent = total;
    }

    clearCart() {
        // Restore stock
        this.cart.forEach(item => {
            const product = this.products.find(p => p.id === item.id);
            if (product) {
                product.stock += item.quantity;
            }
        });

        this.cart = [];
        this.saveCart();
        this.saveProducts();
        this.updateCartDisplay();
        this.renderCartItems();
        this.renderProducts();
    }

    generateOrder() {
        if (this.cart.length === 0) return;

        let orderText = "SEPHYX ORDER REQUEST\n\n";
        orderText += "ITEMS:\n";
        
        let total = 0;
        this.cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            orderText += `- ${item.title} x${item.quantity} - $${itemTotal}\n`;
            total += itemTotal;
        });
        
        orderText += `\nTOTAL: $${total}\n\n`;
        orderText += "Please include your shipping address and contact information.\n";
        orderText += "Order ID: " + Date.now();

        // Save order to local records
        this.saveOrder({
            id: Date.now(),
            items: [...this.cart],
            total: total,
            date: new Date().toISOString(),
            user: this.currentUser?.username || 'Guest'
        });

        document.getElementById('order-text').value = orderText;
        this.showModal('order-modal');
        
        this.clearCart();
        this.addXP(50, 'Generated order');
    }

    saveOrder(order) {
        const orders = JSON.parse(localStorage.getItem('sephyx_orders') || '[]');
        orders.push(order);
        localStorage.setItem('sephyx_orders', JSON.stringify(orders));
    }

    copyOrderToClipboard() {
        const orderText = document.getElementById('order-text');
        orderText.select();
        document.execCommand('copy');
        this.showTerminalMessage('Order copied to clipboard');
    }

    // Carousel
    startCarousel() {
        const slides = document.querySelectorAll('.carousel-slide');
        const indicators = document.getElementById('carousel-indicators');
        
        // Create indicators
        indicators.innerHTML = '';
        slides.forEach((_, index) => {
            const indicator = document.createElement('div');
            indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
            indicator.addEventListener('click', () => this.goToSlide(index));
            indicators.appendChild(indicator);
        });

        this.updateCountdowns();
        this.carouselInterval = setInterval(() => {
            this.nextSlide();
        }, 5000);
    }

    nextSlide() {
        const slides = document.querySelectorAll('.carousel-slide');
        const indicators = document.querySelectorAll('.indicator');
        
        slides[this.currentSlide].classList.remove('active');
        indicators[this.currentSlide].classList.remove('active');
        
        this.currentSlide = (this.currentSlide + 1) % slides.length;
        
        slides[this.currentSlide].classList.add('active');
        indicators[this.currentSlide].classList.add('active');
    }

    prevSlide() {
        const slides = document.querySelectorAll('.carousel-slide');
        const indicators = document.querySelectorAll('.indicator');
        
        slides[this.currentSlide].classList.remove('active');
        indicators[this.currentSlide].classList.remove('active');
        
        this.currentSlide = this.currentSlide === 0 ? slides.length - 1 : this.currentSlide - 1;
        
        slides[this.currentSlide].classList.add('active');
        indicators[this.currentSlide].classList.add('active');
    }

    goToSlide(index) {
        const slides = document.querySelectorAll('.carousel-slide');
        const indicators = document.querySelectorAll('.indicator');
        
        slides[this.currentSlide].classList.remove('active');
        indicators[this.currentSlide].classList.remove('active');
        
        this.currentSlide = index;
        
        slides[this.currentSlide].classList.add('active');
        indicators[this.currentSlide].classList.add('active');
    }

    updateCountdowns() {
        const countdowns = document.querySelectorAll('.countdown');
        
        countdowns.forEach(countdown => {
            const endDate = new Date(countdown.dataset.end);
            
            setInterval(() => {
                const now = new Date();
                const timeLeft = endDate - now;
                
                if (timeLeft <= 0) {
                    countdown.textContent = 'EXPIRED';
                    return;
                }
                
                const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                countdown.textContent = `${days}D ${hours}H ${minutes}M ${seconds}S`;
            }, 1000);
        });
    }

    // Music System
    initMusic() {
        const bgm = document.getElementById('bgm');
        const musicToggle = document.getElementById('music-toggle');
        
        if (this.musicEnabled) {
            bgm.play().catch(() => {
                // Autoplay failed, user needs to interact first
                console.log('Autoplay prevented');
            });
            musicToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
        } else {
            musicToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }
    }

    toggleMusic() {
        const bgm = document.getElementById('bgm');
        const musicToggle = document.getElementById('music-toggle');
        
        if (this.musicEnabled) {
            bgm.pause();
            musicToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
            this.musicEnabled = false;
        } else {
            bgm.play();
            musicToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
            this.musicEnabled = true;
        }
        
        localStorage.setItem('sephyx_music', this.musicEnabled);
    }

    // Navigation
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        document.getElementById(pageId + '-page').classList.add('active');
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
        
        // Handle specific page logic
        switch(pageId) {
            case 'collection':
                this.renderProducts();
                break;
            case 'drops':
                this.updateCountdowns();
                break;
            case 'contact':
                this.setupContactForm();
                break;
        }
        
        this.addXP(5, `Visited ${pageId} page`);
    }

    setupContactForm() {
        const contactForm = document.getElementById('contact-form');
        if (contactForm && !contactForm.hasAttribute('data-setup')) {
            contactForm.setAttribute('data-setup', 'true');
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleContactSubmit();
            });
        }
    }

    handleContactSubmit() {
        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const subject = document.getElementById('contact-subject').value;
        const message = document.getElementById('contact-message').value;
        
        // Simulate message sending
        this.showTerminalMessage('Message transmitted to collective');
        this.addXP(15, 'Contacted the collective');
        
        // Clear form
        document.getElementById('contact-form').reset();
    }

    // Modal System
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        
        if (modalId === 'cart-modal') {
            this.renderCartItems();
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
    }

    showWishlistModal() {
        let wishlistItems = '';
        
        if (this.wishlist.length === 0) {
            wishlistItems = '<p class="empty-wishlist">Your wishlist is empty</p>';
        } else {
            this.wishlist.forEach(id => {
                const product = this.products.find(p => p.id === id);
                if (product) {
                    wishlistItems += `
                        <div class="wishlist-item">
                            <img src="${product.image}" alt="${product.title}">
                            <div class="wishlist-item-info">
                                <h4>${product.title}</h4>
                                <p>$${product.price}</p>
                                <div class="wishlist-actions">
                                    <button onclick="app.addToCart(${product.id})" ${product.stock === 0 ? 'disabled' : ''}>
                                        ${product.stock === 0 ? 'SOLD OUT' : 'ADD TO CART'}
                                    </button>
                                    <button onclick="app.removeFromWishlist(${product.id})">REMOVE</button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
        }
        
        // Create wishlist modal if it doesn't exist
        let wishlistModal = document.getElementById('wishlist-modal');
        if (!wishlistModal) {
            wishlistModal = document.createElement('div');
            wishlistModal.id = 'wishlist-modal';
            wishlistModal.className = 'modal';
            wishlistModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>WISHLIST</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="wishlist-items">${wishlistItems}</div>
                    </div>
                </div>
            `;
            document.body.appendChild(wishlistModal);
            
            // Add close functionality
            wishlistModal.querySelector('.modal-close').addEventListener('click', () => {
                this.hideModal('wishlist-modal');
            });
        } else {
            document.getElementById('wishlist-items').innerHTML = wishlistItems;
        }
        
        this.showModal('wishlist-modal');
    }

    // Terminal Messages
    showTerminalMessage(message) {
        const popup = document.getElementById('terminal-popup');
        const text = document.getElementById('terminal-text');
        
        text.textContent = message;
        popup.classList.add('active');
        
        setTimeout(() => {
            popup.classList.remove('active');
        }, 3000);
    }

    showRandomTerminalMessage() {
        const messages = [
            "Vault Access Detected",
            "Glitchwave Synced",
            "ERROR: Reality Breached",
            "Neural Link Established",
            "Crypto Drip Initialized",
            "System Infiltration: 100%",
            "Digital Prophet Online",
            "Matrix Runner Activated"
        ];
        
        setInterval(() => {
            if (Math.random() < 0.3) { // 30% chance every interval
                const message = messages[Math.floor(Math.random() * messages.length)];
                this.showTerminalMessage(message);
            }
        }, 30000); // Every 30 seconds
    }

    // Easter Eggs and Vault
    setupEasterEggs() {
        this.addEasterEggListeners();
        this.setupKonamiCode();
        this.addClickableLogos();
    }

    addEasterEggListeners() {
        // Add hidden clickable elements
        const easterEggs = [
            { x: '10%', y: '20%' },
            { x: '85%', y: '15%' },
            { x: '50%', y: '80%' },
            { x: '20%', y: '60%' },
            { x: '75%', y: '45%' }
        ];

        easterEggs.forEach((pos, index) => {
            const egg = document.createElement('div');
            egg.className = 'easter-egg';
            egg.style.left = pos.x;
            egg.style.top = pos.y;
            egg.addEventListener('click', () => {
                this.easterEggFound(index);
            });
            document.body.appendChild(egg);
        });
    }

    easterEggFound(index) {
        const found = JSON.parse(localStorage.getItem('sephyx_easter_eggs') || '[]');
        if (!found.includes(index)) {
            found.push(index);
            localStorage.setItem('sephyx_easter_eggs', JSON.stringify(found));
            this.addXP(25, 'Found easter egg');
            this.showTerminalMessage('Easter egg discovered!');
            
            if (found.length >= 3) {
                this.unlockVault();
            }
        }
    }

    setupKonamiCode() {
        const konamiCode = [
            'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
            'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
            'KeyB', 'KeyA'
        ];
        let konamiIndex = 0;

        document.addEventListener('keydown', (e) => {
            if (e.code === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    this.konamiCodeEntered();
                    konamiIndex = 0;
                }
            } else {
                konamiIndex = 0;
            }
        });
    }

    konamiCodeEntered() {
        this.addXP(100, 'Konami code activated');
        this.unlockVault();
        this.showTerminalMessage('CHEAT CODE ACTIVATED');
        
        // Add special visual effect
        document.body.style.animation = 'glitch 2s infinite';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 5000);
    }

    addClickableLogos() {
        const logos = document.querySelectorAll('.main-logo, .nav-logo');
        let clickCount = 0;
        
        logos.forEach(logo => {
            logo.addEventListener('click', () => {
                clickCount++;
                if (clickCount >= 7) {
                    this.unlockVault();
                    clickCount = 0;
                }
            });
        });
    }

    unlockVault() {
        if (this.vaultUnlocked) return;
        
        this.vaultUnlocked = true;
        localStorage.setItem('sephyx_vault_unlocked', 'true');
        
        if (this.currentUser) {
            this.currentUser.vaultAccess = true;
            this.saveUserData();
        }
        
        document.querySelector('.vault-link').style.display = 'block';
        this.addXP(200, 'Vault access granted');
        this.showTerminalMessage('VAULT ACCESS GRANTED');
    }

    // Chatbot
    initChatbot() {
        const chatbot = document.getElementById('chatbot');
        const header = document.getElementById('chatbot-header');
        const messages = document.getElementById('chatbot-messages');
        const input = document.getElementById('chatbot-input');
        const send = document.getElementById('chatbot-send');
        
        let isMinimized = false;
        
        header.addEventListener('click', () => {
            isMinimized = !isMinimized;
            if (isMinimized) {
                messages.style.display = 'none';
                document.querySelector('.chatbot-input').style.display = 'none';
            } else {
                messages.style.display = 'block';
                document.querySelector('.chatbot-input').style.display = 'flex';
            }
        });

        send.addEventListener('click', () => this.sendChatMessage(input.value));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage(input.value);
            }
        });
    }

    sendChatMessage(message) {
        if (!message.trim()) return;
        
        const messages = document.getElementById('chatbot-messages');
        const input = document.getElementById('chatbot-input');
        
        // Add user message
        const userMsg = document.createElement('div');
        userMsg.className = 'message user-message';
        userMsg.textContent = message;
        messages.appendChild(userMsg);
        
        // Generate bot response
        setTimeout(() => {
            const botMsg = document.createElement('div');
            botMsg.className = 'message bot-message';
            botMsg.textContent = this.generateChatResponse(message.toLowerCase());
            messages.appendChild(botMsg);
            messages.scrollTop = messages.scrollHeight;
        }, 1000);
        
        input.value = '';
        messages.scrollTop = messages.scrollHeight;
        this.addXP(5, 'Chatbot interaction');
    }

    generateChatResponse(message) {
        const responses = {
            hello: "Greetings, operative. Welcome to the SEPHYX network.",
            help: "I can assist with outfit recommendations, brand lore, or provide access codes. What do you need?",
            vault: "The Vault contains our most exclusive items. Prove your worth through dedication and puzzles.",
            clothing: "Our garments merge high fashion with cutting-edge technology. Each piece tells a story of rebellion.",
            rank: this.currentUser ? `You are currently ranked as ${this.currentUser.rank} with ${this.currentUser.xp} XP.` : "Please authenticate to view your rank status.",
            price: "Our prices reflect the advanced technology embedded in each piece. Quality over quantity, always.",
            founder: "SEPHYX was founded by the collective. We are everyone and no one.",
            mystery: "Some secrets are earned, not given. Keep exploring.",
            code: "Try entering: NEON, GHOST, VOID, CHROME, or PROPHET",
            about: "SEPHYX exists at the intersection of fashion and technology, creating wearable statements for digital rebels."
        };

        // Check for specific keywords
        for (const [keyword, response] of Object.entries(responses)) {
            if (message.includes(keyword)) {
                return response;
            }
        }

        // Special codes
        if (message.includes('neon') || message.includes('ghost') || message.includes('void') || message.includes('chrome') || message.includes('prophet')) {
            this.addXP(15, 'Found chatbot code');
            return "Code accepted. +15 XP granted. You're getting closer to the truth.";
        }

        // Default responses
        const defaults = [
            "Interesting perspective, operative.",
            "The algorithm processes your input...",
            "Error 404: Empathy not found. Try again.",
            "That query requires higher clearance.",
            "The digital gods have spoken, but I cannot translate.",
            "Scanning neural patterns... inconclusive.",
            "Your request has been logged for further analysis."
        ];

        return defaults[Math.floor(Math.random() * defaults.length)];
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page === 'vault' && !this.vaultUnlocked && !this.currentUser?.vaultAccess) {
                    this.showTerminalMessage('Vault access denied. Prove your worth first.');
                    return;
                }
                this.showPage(page);
            });
        });

        // Auth system
        document.getElementById('auth-btn').addEventListener('click', () => {
            this.showModal('auth-modal');
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logoutUser();
        });

        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('auth-username').value;
            const password = document.getElementById('auth-password').value;
            const isLogin = document.getElementById('auth-submit').textContent === 'LOGIN';

            try {
                if (isLogin) {
                    await this.loginUser(username, password);
                } else {
                    const confirm = document.getElementById('auth-confirm').value;
                    if (password !== confirm) {
                        throw new Error('Passwords do not match');
                    }
                    await this.registerUser(username, password);
                }
                this.hideModal('auth-modal');
                this.showTerminalMessage('Authentication successful');
            } catch (error) {
                this.showTerminalMessage(`Error: ${error.message}`);
            }
        });

        document.getElementById('auth-toggle').addEventListener('click', () => {
            const isLogin = document.getElementById('auth-submit').textContent === 'LOGIN';
            const confirmGroup = document.getElementById('confirm-group');
            const submitBtn = document.getElementById('auth-submit');
            const title = document.getElementById('auth-title');
            const toggle = document.getElementById('auth-toggle');

            if (isLogin) {
                confirmGroup.style.display = 'block';
                submitBtn.textContent = 'REGISTER';
                title.textContent = 'CREATE ACCESS';
                toggle.innerHTML = 'Already have access? <span>LOGIN</span>';
            } else {
                confirmGroup.style.display = 'none';
                submitBtn.textContent = 'LOGIN';
                title.textContent = 'ACCESS TERMINAL';
                toggle.innerHTML = "Don't have access? <span>REGISTER</span>";
            }
        });

        // Cart and Wishlist system
        document.getElementById('cart-btn').addEventListener('click', () => {
            this.showModal('cart-modal');
        });

        document.getElementById('wishlist-btn').addEventListener('click', () => {
            this.showWishlistModal();
        });

        document.getElementById('checkout-btn').addEventListener('click', () => {
            this.generateOrder();
        });

        document.getElementById('clear-cart').addEventListener('click', () => {
            this.clearCart();
        });

        document.getElementById('copy-order').addEventListener('click', () => {
            this.copyOrderToClipboard();
        });

        // Product grid
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart')) {
                const productId = parseInt(e.target.dataset.id);
                this.addToCart(productId);
            }
        });

        // Filters
        document.querySelectorAll('.filter-select').forEach(filter => {
            filter.addEventListener('change', () => {
                this.renderProducts();
            });
        });

        // Carousel controls
        document.getElementById('carousel-prev')?.addEventListener('click', () => {
            this.prevSlide();
        });

        document.getElementById('carousel-next')?.addEventListener('click', () => {
            this.nextSlide();
        });

        // Music toggle
        document.getElementById('music-toggle').addEventListener('click', () => {
            this.toggleMusic();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.classList.remove('active');
            });
        });

        document.querySelectorAll('.terminal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const terminal = e.target.closest('.terminal-popup');
                terminal.classList.remove('active');
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // CTA buttons
        document.querySelectorAll('.cta-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showPage('shop');
            });
        });
    }
}

// Initialize the app
const app = new SephyxApp();

// Make app globally available for inline event handlers
window.app = app;
