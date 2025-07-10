// SEPHYX Admin Panel
// Administrative interface for managing the cyberpunk streetwear site

class SephyxAdmin {
    constructor() {
        this.currentAdmin = null;
        this.currentSection = 'products';
        this.editingProduct = null;
        
        this.init();
    }

    init() {
        this.checkAdminSession();
        this.setupEventListeners();
        this.loadInitialData();
    }

    // Authentication
    checkAdminSession() {
        const session = localStorage.getItem('sephyx_admin_session');
        if (session) {
            this.currentAdmin = JSON.parse(session);
            this.showDashboard();
        } else {
            this.showLoginScreen();
        }
    }

    async adminLogin(username, password) {
        // Fixed admin credentials
        const adminCredentials = {
            username: 'admin1',
            password: 'mash123'
        };

        if (username === adminCredentials.username && password === adminCredentials.password) {
            this.currentAdmin = {
                username: username,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem('sephyx_admin_session', JSON.stringify(this.currentAdmin));
            this.showDashboard();
            return true;
        } else {
            throw new Error('Invalid admin credentials');
        }
    }

    adminLogout() {
        localStorage.removeItem('sephyx_admin_session');
        this.currentAdmin = null;
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('admin-dashboard').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').classList.remove('hidden');
        document.getElementById('admin-user').textContent = this.currentAdmin.username;
        this.loadSectionData();
    }

    // Section Management
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active state from nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected section
        document.getElementById(sectionName + '-section').classList.add('active');
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        this.currentSection = sectionName;
        this.loadSectionData();
    }

    loadSectionData() {
        switch (this.currentSection) {
            case 'products':
                this.loadProducts();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'xp':
                this.loadXPManager();
                break;
            case 'vault':
                this.loadVaultControl();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'backup':
                this.loadBackupRestore();
                break;
        }
    }

    loadInitialData() {
        if (this.currentAdmin) {
            this.loadSectionData();
        }
    }

    // Product Management
    loadProducts() {
        const products = JSON.parse(localStorage.getItem('sephyx_products') || '[]');
        const grid = document.getElementById('products-grid');
        
        grid.innerHTML = '';
        
        products.forEach(product => {
            const card = this.createAdminProductCard(product);
            grid.appendChild(card);
        });
    }

    createAdminProductCard(product) {
        const card = document.createElement('div');
        card.className = 'admin-product-card';
        
        card.innerHTML = `
            <img src="${product.image}" alt="${product.title}" class="admin-product-image">
            <div class="admin-product-info">
                <div class="admin-product-title">${product.title}</div>
                <div class="admin-product-details">
                    <div class="detail-item">Price: <span class="detail-value">$${product.price}</span></div>
                    <div class="detail-item">Stock: <span class="detail-value">${product.stock}</span></div>
                    <div class="detail-item">Style: <span class="detail-value">${product.style}</span></div>
                    <div class="detail-item">Rarity: <span class="detail-value">${product.rarity}</span></div>
                </div>
                <div class="admin-product-actions">
                    <button class="edit-btn" onclick="admin.editProduct(${product.id})">EDIT</button>
                    <button class="delete-btn" onclick="admin.deleteProduct(${product.id})">DELETE</button>
                </div>
            </div>
        `;
        
        return card;
    }

    showProductModal(product = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');
        
        if (product) {
            title.textContent = 'EDIT PRODUCT';
            this.editingProduct = product;
            
            // Populate form
            document.getElementById('product-title').value = product.title;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-style').value = product.style;
            document.getElementById('product-rarity').value = product.rarity;
            document.getElementById('product-stock').value = product.stock;
            document.getElementById('product-image').value = product.image;
            document.getElementById('product-description').value = product.description || '';
        } else {
            title.textContent = 'ADD PRODUCT';
            this.editingProduct = null;
            form.reset();
        }
        
        modal.classList.add('active');
    }

    saveProduct() {
        const products = JSON.parse(localStorage.getItem('sephyx_products') || '[]');
        
        const productData = {
            title: document.getElementById('product-title').value,
            price: parseFloat(document.getElementById('product-price').value),
            style: document.getElementById('product-style').value,
            rarity: document.getElementById('product-rarity').value,
            stock: parseInt(document.getElementById('product-stock').value),
            image: document.getElementById('product-image').value,
            description: document.getElementById('product-description').value
        };

        if (this.editingProduct) {
            // Update existing product
            const index = products.findIndex(p => p.id === this.editingProduct.id);
            if (index !== -1) {
                products[index] = { ...products[index], ...productData };
            }
        } else {
            // Add new product
            const newProduct = {
                id: Date.now(),
                ...productData
            };
            products.push(newProduct);
        }

        localStorage.setItem('sephyx_products', JSON.stringify(products));
        this.hideModal('product-modal');
        this.loadProducts();
        this.showNotification('Product saved successfully');
    }

    editProduct(productId) {
        const products = JSON.parse(localStorage.getItem('sephyx_products') || '[]');
        const product = products.find(p => p.id === productId);
        if (product) {
            this.showProductModal(product);
        }
    }

    deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            const products = JSON.parse(localStorage.getItem('sephyx_products') || '[]');
            const filteredProducts = products.filter(p => p.id !== productId);
            localStorage.setItem('sephyx_products', JSON.stringify(filteredProducts));
            this.loadProducts();
            this.showNotification('Product deleted successfully');
        }
    }

    // Inventory Management
    loadInventory() {
        const products = JSON.parse(localStorage.getItem('sephyx_products') || '[]');
        const tbody = document.getElementById('inventory-tbody');
        
        tbody.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.title}</td>
                <td>
                    <input type="number" class="stock-input" value="${product.stock}" 
                           onchange="admin.updateStock(${product.id}, this.value)" min="0">
                </td>
                <td>
                    <button class="btn-secondary" onclick="admin.toggleSoldOut(${product.id})">
                        ${product.stock === 0 ? 'RESTOCK' : 'MARK SOLD OUT'}
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateStock(productId, newStock) {
        const products = JSON.parse(localStorage.getItem('sephyx_products') || '[]');
        const product = products.find(p => p.id === productId);
        if (product) {
            product.stock = parseInt(newStock);
            localStorage.setItem('sephyx_products', JSON.stringify(products));
            this.showNotification('Stock updated');
        }
    }

    toggleSoldOut(productId) {
        const products = JSON.parse(localStorage.getItem('sephyx_products') || '[]');
        const product = products.find(p => p.id === productId);
        if (product) {
            product.stock = product.stock === 0 ? 10 : 0;
            localStorage.setItem('sephyx_products', JSON.stringify(products));
            this.loadInventory();
            this.showNotification(product.stock === 0 ? 'Marked as sold out' : 'Restocked item');
        }
    }

    resetAllStock() {
        if (confirm('Reset all product stock to 20?')) {
            const products = JSON.parse(localStorage.getItem('sephyx_products') || '[]');
            products.forEach(product => {
                product.stock = 20;
            });
            localStorage.setItem('sephyx_products', JSON.stringify(products));
            this.loadInventory();
            this.showNotification('All stock reset to 20');
        }
    }

    // Order Management
    loadOrders() {
        const orders = JSON.parse(localStorage.getItem('sephyx_orders') || '[]');
        const container = document.getElementById('orders-container');
        
        container.innerHTML = '';
        
        if (orders.length === 0) {
            container.innerHTML = '<div class="empty-state">No orders found</div>';
            return;
        }

        orders.reverse().forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-card';
            
            const orderDate = new Date(order.date).toLocaleString();
            
            card.innerHTML = `
                <div class="order-header">
                    <div class="order-id">ORDER #${order.id}</div>
                    <div class="order-date">${orderDate}</div>
                </div>
                <div class="order-items">
                    ${order.items.map(item => 
                        `<div class="order-item">
                            <span>${item.title} x${item.quantity}</span>
                            <span>$${item.price * item.quantity}</span>
                        </div>`
                    ).join('')}
                </div>
                <div class="order-total">TOTAL: $${order.total}</div>
                <div class="order-user">User: ${order.user}</div>
            `;
            
            container.appendChild(card);
        });
    }

    exportOrders() {
        const orders = JSON.parse(localStorage.getItem('sephyx_orders') || '[]');
        const dataStr = JSON.stringify(orders, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `sephyx_orders_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('Orders exported successfully');
    }

    // User Management
    loadUsers() {
        const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
        const tbody = document.getElementById('users-tbody');
        const totalUsers = document.getElementById('total-users');
        const activeToday = document.getElementById('active-today');
        
        totalUsers.textContent = users.length;
        
        const today = new Date().toDateString();
        const activeTodayCount = users.filter(user => {
            return user.lastVisit && new Date(user.lastVisit).toDateString() === today;
        }).length;
        activeToday.textContent = activeTodayCount;
        
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const timeSpent = this.formatTimeSpent(user.timeSpent || 0);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.rank}</td>
                <td>${user.xp}</td>
                <td>${user.visits || 0}</td>
                <td>${timeSpent}</td>
                <td>
                    <button class="btn-secondary" onclick="admin.kickUser('${user.username}')">KICK</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    formatTimeSpent(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    kickUser(username) {
        if (confirm(`Remove user ${username} from the system?`)) {
            const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
            const filteredUsers = users.filter(u => u.username !== username);
            localStorage.setItem('sephyx_users', JSON.stringify(filteredUsers));
            this.loadUsers();
            this.showNotification(`User ${username} has been removed`);
        }
    }

    // XP Management
    loadXPManager() {
        const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
        const userSelect = document.getElementById('user-select');
        const rankUserSelect = document.getElementById('rank-user-select');
        
        // Populate user selects
        userSelect.innerHTML = '<option value="">Select User</option>';
        rankUserSelect.innerHTML = '<option value="">Select User</option>';
        
        users.forEach(user => {
            const option1 = document.createElement('option');
            option1.value = user.username;
            option1.textContent = `${user.username} (${user.rank})`;
            userSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = user.username;
            option2.textContent = `${user.username} (${user.rank})`;
            rankUserSelect.appendChild(option2);
        });
    }

    addXP() {
        const username = document.getElementById('user-select').value;
        const amount = parseInt(document.getElementById('xp-amount').value);
        const reason = document.getElementById('xp-reason').value;
        
        if (!username || !amount) {
            this.showNotification('Please select a user and enter XP amount', 'error');
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
        const user = users.find(u => u.username === username);
        
        if (user) {
            user.xp += amount;
            this.updateUserRank(user);
            localStorage.setItem('sephyx_users', JSON.stringify(users));
            
            // Clear form
            document.getElementById('xp-amount').value = '';
            document.getElementById('xp-reason').value = '';
            
            this.showNotification(`Added ${amount} XP to ${username}`);
            this.loadUsers();
        }
    }

    setUserRank() {
        const username = document.getElementById('rank-user-select').value;
        const newRank = document.getElementById('new-rank').value;
        
        if (!username || !newRank) {
            this.showNotification('Please select a user and rank', 'error');
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
        const user = users.find(u => u.username === username);
        
        if (user) {
            user.rank = newRank;
            localStorage.setItem('sephyx_users', JSON.stringify(users));
            this.showNotification(`Set ${username} rank to ${newRank}`);
            this.loadUsers();
            this.loadXPManager();
        }
    }

    updateUserRank(user) {
        const xp = user.xp;
        let newRank = 'INITIATE';
        
        if (xp >= 1000) newRank = 'NEON THIEF';
        else if (xp >= 500) newRank = 'CYBER GHOST';
        else if (xp >= 200) newRank = 'DATA RUNNER';
        else if (xp >= 100) newRank = 'TERMINAL USER';

        user.rank = newRank;
    }

    // Vault Control
    loadVaultControl() {
        const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
        const vaultUsers = users.filter(u => u.vaultAccess);
        const vaultUsersList = document.getElementById('vault-users-list');
        const vaultUserSelect = document.getElementById('vault-user-select');
        
        // Show users with vault access
        vaultUsersList.innerHTML = '';
        if (vaultUsers.length === 0) {
            vaultUsersList.innerHTML = '<div class="empty-state">No users have vault access</div>';
        } else {
            vaultUsers.forEach(user => {
                const item = document.createElement('div');
                item.className = 'vault-user-item';
                item.innerHTML = `
                    <span>${user.username} (${user.rank})</span>
                    <button class="btn-danger" onclick="admin.revokeVaultAccess('${user.username}')">REVOKE</button>
                `;
                vaultUsersList.appendChild(item);
            });
        }
        
        // Populate user select for granting access
        vaultUserSelect.innerHTML = '<option value="">Select User</option>';
        users.filter(u => !u.vaultAccess).forEach(user => {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = `${user.username} (${user.rank})`;
            vaultUserSelect.appendChild(option);
        });
    }

    grantVaultAccess() {
        const username = document.getElementById('vault-user-select').value;
        if (!username) {
            this.showNotification('Please select a user', 'error');
            return;
        }
        
        const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
        const user = users.find(u => u.username === username);
        
        if (user) {
            user.vaultAccess = true;
            localStorage.setItem('sephyx_users', JSON.stringify(users));
            this.showNotification(`Granted vault access to ${username}`);
            this.loadVaultControl();
        }
    }

    revokeVaultAccess(username) {
        if (confirm(`Revoke vault access for ${username}?`)) {
            const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
            const user = users.find(u => u.username === username);
            
            if (user) {
                user.vaultAccess = false;
                localStorage.setItem('sephyx_users', JSON.stringify(users));
                this.showNotification(`Revoked vault access for ${username}`);
                this.loadVaultControl();
            }
        }
    }

    resetAllVaultAccess() {
        if (confirm('Remove vault access from all users?')) {
            const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
            users.forEach(user => {
                user.vaultAccess = false;
            });
            localStorage.setItem('sephyx_users', JSON.stringify(users));
            localStorage.removeItem('sephyx_vault_unlocked');
            this.showNotification('All vault access has been reset');
            this.loadVaultControl();
        }
    }

    // Settings Management
    loadSettings() {
        // Load current settings from localStorage
        const settings = {
            easterEggs: localStorage.getItem('sephyx_easter_eggs_enabled') !== 'false',
            vaultAccess: localStorage.getItem('sephyx_vault_enabled') !== 'false',
            glitchEffects: localStorage.getItem('sephyx_glitch_enabled') !== 'false',
            backgroundMusic: localStorage.getItem('sephyx_music_enabled') !== 'false',
            terminalMessages: localStorage.getItem('sephyx_terminal_enabled') !== 'false'
        };
        
        document.getElementById('easter-eggs-toggle').checked = settings.easterEggs;
        document.getElementById('vault-access-toggle').checked = settings.vaultAccess;
        document.getElementById('glitch-effects-toggle').checked = settings.glitchEffects;
        document.getElementById('background-music-toggle').checked = settings.backgroundMusic;
        document.getElementById('terminal-messages-toggle').checked = settings.terminalMessages;
    }

    saveSettings() {
        const settings = {
            easterEggs: document.getElementById('easter-eggs-toggle').checked,
            vaultAccess: document.getElementById('vault-access-toggle').checked,
            glitchEffects: document.getElementById('glitch-effects-toggle').checked,
            backgroundMusic: document.getElementById('background-music-toggle').checked,
            terminalMessages: document.getElementById('terminal-messages-toggle').checked
        };
        
        localStorage.setItem('sephyx_easter_eggs_enabled', settings.easterEggs);
        localStorage.setItem('sephyx_vault_enabled', settings.vaultAccess);
        localStorage.setItem('sephyx_glitch_enabled', settings.glitchEffects);
        localStorage.setItem('sephyx_music_enabled', settings.backgroundMusic);
        localStorage.setItem('sephyx_terminal_enabled', settings.terminalMessages);
        
        this.showNotification('Settings saved successfully');
    }

    // Backup and Restore
    loadBackupRestore() {
        // This section is ready to use, no additional loading needed
    }

    exportAllData() {
        const data = {
            products: JSON.parse(localStorage.getItem('sephyx_products') || '[]'),
            users: JSON.parse(localStorage.getItem('sephyx_users') || '[]'),
            orders: JSON.parse(localStorage.getItem('sephyx_orders') || '[]'),
            settings: {
                easterEggs: localStorage.getItem('sephyx_easter_eggs_enabled'),
                vaultAccess: localStorage.getItem('sephyx_vault_enabled'),
                glitchEffects: localStorage.getItem('sephyx_glitch_enabled'),
                backgroundMusic: localStorage.getItem('sephyx_music_enabled'),
                terminalMessages: localStorage.getItem('sephyx_terminal_enabled')
            },
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `sephyx_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('All data exported successfully');
    }

    exportProducts() {
        const products = JSON.parse(localStorage.getItem('sephyx_products') || '[]');
        const dataStr = JSON.stringify(products, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `sephyx_products_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('Products exported successfully');
    }

    exportUsers() {
        const users = JSON.parse(localStorage.getItem('sephyx_users') || '[]');
        const dataStr = JSON.stringify(users, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `sephyx_users_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('Users exported successfully');
    }

    importData() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showNotification('Please select a file to import', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.products) {
                    localStorage.setItem('sephyx_products', JSON.stringify(data.products));
                }
                if (data.users) {
                    localStorage.setItem('sephyx_users', JSON.stringify(data.users));
                }
                if (data.orders) {
                    localStorage.setItem('sephyx_orders', JSON.stringify(data.orders));
                }
                if (data.settings) {
                    Object.keys(data.settings).forEach(key => {
                        if (data.settings[key] !== null) {
                            localStorage.setItem(`sephyx_${key}_enabled`, data.settings[key]);
                        }
                    });
                }
                
                this.showNotification('Data imported successfully');
                this.loadSectionData();
                
            } catch (error) {
                this.showNotification('Error importing data: Invalid file format', 'error');
            }
        };
        
        reader.readAsText(file);
    }

    resetAllData() {
        if (confirm('WARNING: This will delete ALL data including products, users, and orders. This cannot be undone!')) {
            const keysToRemove = [];
            for (let key in localStorage) {
                if (key.startsWith('sephyx_')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            this.showNotification('All data has been reset');
            this.loadSectionData();
        }
    }

    // Utility Functions
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? 'var(--danger-red)' : 'var(--success-green)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Event Listeners
    setupEventListeners() {
        // Login form
        document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            const errorElement = document.getElementById('login-error');
            
            try {
                await this.adminLogin(username, password);
                errorElement.textContent = '';
            } catch (error) {
                errorElement.textContent = error.message;
            }
        });

        // Logout button
        document.getElementById('admin-logout').addEventListener('click', () => {
            this.adminLogout();
        });

        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.showSection(section);
            });
        });

        // Product management
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.showProductModal();
        });

        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Inventory management
        document.getElementById('reset-stock-btn').addEventListener('click', () => {
            this.resetAllStock();
        });

        // Order management
        document.getElementById('export-orders-btn').addEventListener('click', () => {
            this.exportOrders();
        });

        // XP management
        document.getElementById('add-xp-btn').addEventListener('click', () => {
            this.addXP();
        });

        document.getElementById('set-rank-btn').addEventListener('click', () => {
            this.setUserRank();
        });

        // Vault control
        document.getElementById('grant-vault-btn').addEventListener('click', () => {
            this.grantVaultAccess();
        });

        document.getElementById('reset-vault-btn').addEventListener('click', () => {
            this.resetAllVaultAccess();
        });

        // Settings
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Backup/Restore
        document.getElementById('export-all-btn').addEventListener('click', () => {
            this.exportAllData();
        });

        document.getElementById('export-products-btn').addEventListener('click', () => {
            this.exportProducts();
        });

        document.getElementById('export-users-btn').addEventListener('click', () => {
            this.exportUsers();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            this.importData();
        });

        document.getElementById('reset-all-btn').addEventListener('click', () => {
            this.resetAllData();
        });

        // Modal close handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.classList.remove('active');
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
    }
}

// Initialize admin panel
const admin = new SephyxAdmin();

// Make admin globally available for inline event handlers
window.admin = admin;

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .empty-state {
        text-align: center;
        color: var(--text-secondary);
        padding: 2rem;
        font-style: italic;
    }
`;
document.head.appendChild(style);
