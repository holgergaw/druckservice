/**
 * Admin Dashboard — Auftragsübersicht
 */
const AdminDashboard = {
    currentFilter: '',
    currentSearch: '',

    async render() {
        const isAuth = await API.checkAuth();
        if (!isAuth) { location.hash = '#/admin'; return; }

        const app = document.getElementById('app');
        app.innerHTML = `
            <h2>Dashboard</h2>
            <div id="stats-bar" class="stats-bar">Laden...</div>

            <div class="filter-bar">
                <select id="status-filter" class="form-control">
                    <option value="">Alle Status</option>
                    <option value="new">Neu</option>
                    <option value="reviewed">Geprüft</option>
                    <option value="offered">Angebot gesendet</option>
                    <option value="accepted">Angenommen</option>
                    <option value="printing">Wird gedruckt</option>
                    <option value="done">Fertig</option>
                    <option value="delivered">Übergeben</option>
                    <option value="rejected">Abgelehnt</option>
                    <option value="cancelled">Storniert</option>
                </select>
                <input type="search" id="search-input" placeholder="Suche (Name, E-Mail, Nr.)" class="form-control">
            </div>

            <div id="orders-table-wrap">Laden...</div>
        `;

        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.loadOrders();
        });

        let searchTimeout;
        document.getElementById('search-input').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentSearch = e.target.value;
                this.loadOrders();
            }, 300);
        });

        this.loadStats();
        this.loadOrders();
    },

    async loadStats() {
        try {
            const stats = await API.getStats();
            const counts = stats.status_counts;
            document.getElementById('stats-bar').innerHTML = `
                <div class="stat-card stat-highlight" onclick="AdminDashboard.filterTo('new')">
                    <span class="stat-number">${counts.new || 0}</span>
                    <span class="stat-label">Neu</span>
                </div>
                <div class="stat-card" onclick="AdminDashboard.filterTo('offered')">
                    <span class="stat-number">${counts.offered || 0}</span>
                    <span class="stat-label">Angeboten</span>
                </div>
                <div class="stat-card" onclick="AdminDashboard.filterTo('accepted')">
                    <span class="stat-number">${counts.accepted || 0}</span>
                    <span class="stat-label">Angenommen</span>
                </div>
                <div class="stat-card" onclick="AdminDashboard.filterTo('printing')">
                    <span class="stat-number">${counts.printing || 0}</span>
                    <span class="stat-label">Druckt</span>
                </div>
                <div class="stat-card" onclick="AdminDashboard.filterTo('done')">
                    <span class="stat-number">${counts.done || 0}</span>
                    <span class="stat-label">Fertig</span>
                </div>
                <div class="stat-card stat-warn">
                    <span class="stat-number">${stats.unpaid || 0}</span>
                    <span class="stat-label">Unbezahlt</span>
                </div>
            `;
        } catch {}
    },

    filterTo(status) {
        this.currentFilter = status;
        document.getElementById('status-filter').value = status;
        this.loadOrders();
    },

    async loadOrders() {
        const wrap = document.getElementById('orders-table-wrap');
        try {
            const orders = await API.getAdminOrders(this.currentFilter, this.currentSearch);

            if (orders.length === 0) {
                wrap.innerHTML = '<p class="text-muted">Keine Aufträge gefunden.</p>';
                return;
            }

            wrap.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nr.</th>
                            <th>Datum</th>
                            <th>Kunde</th>
                            <th>Modell</th>
                            <th>Status</th>
                            <th>Preis</th>
                            <th>Bezahlt</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(o => `
                            <tr class="${o.status === 'new' ? 'row-highlight' : ''}">
                                <td><strong>${escHtml(o.order_number)}</strong></td>
                                <td>${formatDate(o.created_at)}</td>
                                <td>${escHtml(o.contact_name)}<br><small class="text-muted">${escHtml(o.contact_email)}</small></td>
                                <td>
                                    ${o.source_type === 'upload' ? '&#128196; Upload' : ''}
                                    ${o.source_type === 'catalog' ? '&#128218; Katalog' : ''}
                                    ${o.source_type === 'link' ? '&#128279; Link' : ''}
                                </td>
                                <td>${statusBadge(o.status)}</td>
                                <td>${formatPrice(o.total_price)}</td>
                                <td>${o.is_paid == 1 ? '<span class="badge badge-paid">Ja</span>' : '<span class="text-muted">Nein</span>'}</td>
                                <td><a href="#/admin/orders/${o.id}" class="btn btn-sm">Details</a></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (err) {
            wrap.innerHTML = `<p class="alert alert-error">${escHtml(err.message)}</p>`;
        }
    },
};
