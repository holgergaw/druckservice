/**
 * API Client — Fetch-Wrapper für alle API-Aufrufe
 */
const API = {
    csrfToken: null,

    async request(method, path, body = null, isFormData = false) {
        const options = {
            method,
            headers: {},
        };

        if (this.csrfToken) {
            options.headers['X-CSRF-Token'] = this.csrfToken;
        }

        if (body && !isFormData) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        } else if (body && isFormData) {
            options.body = body; // FormData sets its own Content-Type
        }

        const response = await fetch(`/api${path}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ein Fehler ist aufgetreten');
        }

        return data;
    },

    get(path) { return this.request('GET', path); },
    post(path, body, isFormData = false) { return this.request('POST', path, body, isFormData); },
    patch(path, body) { return this.request('PATCH', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    delete(path) { return this.request('DELETE', path); },

    // --- Public endpoints ---
    getCatalog() { return this.get('/catalog'); },
    getMaterials() { return this.get('/materials'); },
    getColors() { return this.get('/colors'); },

    createOrder(formData) { return this.post('/orders', formData, true); },
    getOrderStatus(nr, token) { return this.get(`/orders/${nr}?token=${token}`); },
    acceptOrder(nr, token) { return this.post(`/orders/${nr}/accept?token=${token}`); },
    declineOrder(nr, token) { return this.post(`/orders/${nr}/decline?token=${token}`); },

    // --- Admin endpoints ---
    async login(password) {
        const data = await this.post('/admin/login', { password });
        this.csrfToken = data.csrf_token;
        localStorage.setItem('csrf_token', data.csrf_token);
        return data;
    },

    async checkAuth() {
        try {
            const data = await this.get('/admin/auth');
            if (data.authenticated) {
                this.csrfToken = data.csrf_token;
                localStorage.setItem('csrf_token', data.csrf_token);
            }
            return data.authenticated;
        } catch {
            return false;
        }
    },

    async logout() {
        // Send CSRF token for logout
        this.csrfToken = localStorage.getItem('csrf_token');
        await this.post('/admin/logout');
        this.csrfToken = null;
        localStorage.removeItem('csrf_token');
    },

    getStats() { return this.get('/admin/stats'); },
    getAdminOrders(status = '', search = '') {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (search) params.set('search', search);
        const qs = params.toString();
        return this.get(`/admin/orders${qs ? '?' + qs : ''}`);
    },
    getAdminOrder(id) { return this.get(`/admin/orders/${id}`); },
    updateOrder(id, data) { return this.patch(`/admin/orders/${id}`, data); },
    sendOffer(id) { return this.post(`/admin/orders/${id}/offer`); },
    rejectOrder(id, reason) { return this.post(`/admin/orders/${id}/reject`, { reason }); },

    getAdminCatalog() { return this.get('/admin/catalog'); },
    createCatalogItem(data) { return this.post('/admin/catalog', data); },
    updateCatalogItem(id, data) { return this.patch(`/admin/catalog/${id}`, data); },
    deleteCatalogItem(id) { return this.delete(`/admin/catalog/${id}`); },
    uploadCatalogImage(id, formData) { return this.post(`/admin/catalog/${id}/image`, formData, true); },

    getAdminMaterials() { return this.get('/admin/materials'); },
    createMaterial(data) { return this.post('/admin/materials', data); },
    updateMaterial(id, data) { return this.patch(`/admin/materials/${id}`, data); },

    getAdminColors() { return this.get('/admin/colors'); },
    createColor(data) { return this.post('/admin/colors', data); },
    updateColor(id, data) { return this.patch(`/admin/colors/${id}`, data); },

    getSettings() { return this.get('/admin/settings'); },
    updateSettings(data) { return this.put('/admin/settings', data); },
};

// Restore CSRF token from localStorage
API.csrfToken = localStorage.getItem('csrf_token');
