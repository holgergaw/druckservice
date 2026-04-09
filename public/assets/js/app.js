/**
 * SPA Router & App-Einstiegspunkt
 */
const App = {
    currentRoute: '',

    routes: {
        '/': () => Landing.render(),
        '/anfrage': () => OrderForm.render(),
        '/order/:nr': (params) => OrderStatus.render(params.nr),
        '/admin': () => AdminLogin.render(),
        '/admin/dashboard': () => AdminDashboard.render(),
        '/admin/orders/:id': (params) => AdminOrder.render(params.id),
        '/admin/katalog': () => AdminCatalog.render(),
        '/admin/einstellungen': () => AdminSettings.render(),
    },

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    handleRoute() {
        const hash = location.hash.slice(1) || '/';
        const [path, queryString] = hash.split('?');

        // Parse query params
        this.queryParams = {};
        if (queryString) {
            new URLSearchParams(queryString).forEach((v, k) => {
                this.queryParams[k] = v;
            });
        }

        // Match route
        for (const [pattern, handler] of Object.entries(this.routes)) {
            const params = this.matchRoute(pattern, path);
            if (params !== null) {
                this.currentRoute = pattern;
                handler(params);
                this.updateNav();
                return;
            }
        }

        // 404
        document.getElementById('app').innerHTML = `
            <div class="card" style="text-align:center; padding:3rem;">
                <h2>Seite nicht gefunden</h2>
                <p><a href="#/">Zur Startseite</a></p>
            </div>
        `;
    },

    matchRoute(pattern, path) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) return null;

        const params = {};
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
            } else if (patternParts[i] !== pathParts[i]) {
                return null;
            }
        }
        return params;
    },

    updateNav() {
        const nav = document.getElementById('main-nav');
        const isAdmin = this.currentRoute.startsWith('/admin');

        if (isAdmin && this.currentRoute !== '/admin') {
            nav.innerHTML = `
                <a href="#/admin/dashboard">Dashboard</a>
                <a href="#/admin/katalog">Katalog</a>
                <a href="#/admin/einstellungen">Einstellungen</a>
                <a href="#" onclick="App.doLogout(event)">Abmelden</a>
            `;
        } else {
            nav.innerHTML = `
                <a href="#/">Start</a>
                <a href="#/anfrage">Neue Anfrage</a>
            `;
        }
    },

    async doLogout(e) {
        e.preventDefault();
        try {
            await API.logout();
        } catch {}
        location.hash = '#/admin';
    },
};

// --- Helper functions ---

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatPrice(price) {
    if (price === null || price === undefined) return '–';
    return parseFloat(price).toFixed(2).replace('.', ',') + ' EUR';
}

const STATUS_LABELS = {
    'new': 'Neu',
    'reviewed': 'Geprüft',
    'offered': 'Angebot gesendet',
    'accepted': 'Angenommen',
    'rejected': 'Abgelehnt',
    'printing': 'Wird gedruckt',
    'done': 'Fertig',
    'delivered': 'Übergeben',
    'cancelled': 'Storniert',
};

function statusLabel(status) {
    return STATUS_LABELS[status] || status;
}

function statusBadge(status) {
    return `<span class="badge badge-${status}">${escHtml(statusLabel(status))}</span>`;
}

function showMessage(container, msg, type = 'error') {
    const el = typeof container === 'string' ? $(container) : container;
    if (!el) return;
    el.innerHTML = `<div class="alert alert-${type}">${escHtml(msg)}</div>`;
}

// Start app
App.init();
