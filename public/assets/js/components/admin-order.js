/**
 * Admin Auftragsdetail — Prüfung, Preiskalkulation, Status-Management
 */
const AdminOrder = {
    order: null,

    async render(id) {
        const isAuth = await API.checkAuth();
        if (!isAuth) { location.hash = '#/admin'; return; }

        const app = document.getElementById('app');
        app.innerHTML = '<div class="card"><p>Auftrag wird geladen...</p></div>';

        try {
            this.order = await API.getAdminOrder(id);
            this.renderDetail();
        } catch (err) {
            app.innerHTML = `<div class="card"><p class="alert alert-error">${escHtml(err.message)}</p></div>`;
        }
    },

    renderDetail() {
        const o = this.order;
        const app = document.getElementById('app');

        app.innerHTML = `
            <div class="order-header">
                <a href="#/admin/dashboard" class="btn btn-sm btn-secondary">&larr; Zurück</a>
                <h2>Auftrag ${escHtml(o.order_number)}</h2>
                ${statusBadge(o.status)}
                ${o.is_paid == 1 ? '<span class="badge badge-paid">Bezahlt</span>' : ''}
            </div>

            <div class="card-grid">
                <!-- Kundendaten -->
                <div class="card">
                    <h3>Kunde</h3>
                    <p><strong>${escHtml(o.contact_name)}</strong></p>
                    <p>${escHtml(o.contact_email)}</p>
                    ${o.contact_phone ? `<p>${escHtml(o.contact_phone)}</p>` : ''}
                </div>

                <!-- Modell -->
                <div class="card">
                    <h3>Modell</h3>
                    <p><strong>Quelle:</strong>
                        ${o.source_type === 'upload' ? 'Hochgeladen' : ''}
                        ${o.source_type === 'catalog' ? 'Katalog' : ''}
                        ${o.source_type === 'link' ? 'Externer Link' : ''}
                    </p>
                    ${o.source_type === 'upload' ? `
                        <p>${escHtml(o.upload_original_name)}</p>
                        <p><small>${(o.upload_size_bytes / 1024 / 1024).toFixed(2)} MB</small></p>
                        <a href="${escHtml(o.upload_url)}" class="btn btn-sm" download>Herunterladen</a>
                    ` : ''}
                    ${o.source_type === 'catalog' ? `<p>${escHtml(o.catalog_title || '–')}</p>` : ''}
                    ${o.source_type === 'link' ? `<p><a href="${escHtml(o.external_url)}" target="_blank" rel="noopener">${escHtml(o.external_url)}</a></p>` : ''}
                </div>

                <!-- Wünsche -->
                <div class="card">
                    <h3>Kundenwünsche</h3>
                    <p><strong>Anzahl:</strong> ${o.quantity}</p>
                    <p><strong>Material:</strong> ${escHtml(o.material_name || 'Keine Präferenz')}</p>
                    <p><strong>Farbe:</strong>
                        ${o.hex_code ? `<span class="color-dot" style="background:${o.hex_code}"></span>` : ''}
                        ${escHtml(o.color_name || 'Keine Präferenz')}
                    </p>
                    ${o.customer_notes ? `<p><strong>Notizen:</strong> ${escHtml(o.customer_notes)}</p>` : ''}
                </div>
            </div>

            <!-- Preiskalkulation -->
            <div class="card">
                <h3>Preiskalkulation</h3>
                <form id="pricing-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Gewicht (g)</label>
                            <input type="number" step="0.01" name="estimated_weight_g"
                                   value="${o.estimated_weight_g || ''}" placeholder="z.B. 45.5"
                                   oninput="AdminOrder.recalculate()">
                        </div>
                        <div class="form-group">
                            <label>Druckzeit (min)</label>
                            <input type="number" name="estimated_time_min"
                                   value="${o.estimated_time_min || ''}" placeholder="z.B. 180"
                                   oninput="AdminOrder.recalculate()">
                        </div>
                        <div class="form-group">
                            <label>Materialkosten (EUR)</label>
                            <input type="number" step="0.01" name="material_cost"
                                   value="${o.material_cost || ''}" id="material_cost">
                        </div>
                        <div class="form-group">
                            <label>Stromkosten (EUR)</label>
                            <input type="number" step="0.01" name="electricity_cost"
                                   value="${o.electricity_cost || ''}" id="electricity_cost">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><strong>Gesamtpreis (EUR)</strong></label>
                            <input type="number" step="0.01" name="total_price"
                                   value="${o.total_price || ''}" id="total_price" class="input-highlight">
                        </div>
                        <div class="form-group">
                            <label>Preis-Hinweis für Kunden</label>
                            <input type="text" name="price_note"
                                   value="${escHtml(o.price_note || '')}"
                                   placeholder="z.B. inkl. 2 Farbwechsel">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Admin-Notizen (intern)</label>
                        <textarea name="admin_notes" rows="2">${escHtml(o.admin_notes || '')}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="is_paid" ${o.is_paid == 1 ? 'checked' : ''}>
                                Bezahlt
                            </label>
                        </div>
                    </div>
                    <div id="pricing-message"></div>
                    <button type="submit" class="btn btn-primary">Speichern</button>
                </form>
            </div>

            <!-- Aktionen -->
            <div class="card">
                <h3>Aktionen</h3>
                <div class="action-buttons" id="admin-actions">
                    ${this.renderActions(o)}
                </div>
                <div id="action-message"></div>
            </div>

            <!-- Status-Verlauf -->
            <div class="card">
                <h3>Status-Verlauf</h3>
                <table class="data-table">
                    <thead>
                        <tr><th>Zeitpunkt</th><th>Von</th><th>Nach</th><th>Durch</th><th>Kommentar</th></tr>
                    </thead>
                    <tbody>
                        ${(o.status_history || []).map(h => `
                            <tr>
                                <td>${formatDate(h.created_at)}</td>
                                <td>${h.old_status ? statusLabel(h.old_status) : '–'}</td>
                                <td>${statusLabel(h.new_status)}</td>
                                <td>${escHtml(h.changed_by)}</td>
                                <td>${escHtml(h.comment || '')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Bind pricing form
        document.getElementById('pricing-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.savePricing(e.target);
        });
    },

    renderActions(o) {
        const actions = [];

        switch (o.status) {
            case 'new':
                actions.push(`<button class="btn btn-primary" onclick="AdminOrder.changeStatus('reviewed')">Als geprüft markieren</button>`);
                actions.push(`<button class="btn btn-danger" onclick="AdminOrder.doReject()">Ablehnen</button>`);
                break;
            case 'reviewed':
                actions.push(`<button class="btn btn-primary" onclick="AdminOrder.doSendOffer()">Angebot senden</button>`);
                actions.push(`<button class="btn btn-danger" onclick="AdminOrder.doReject()">Ablehnen</button>`);
                break;
            case 'offered':
                actions.push(`<span class="text-muted">Warte auf Kundenantwort...</span>`);
                break;
            case 'accepted':
                actions.push(`<button class="btn btn-primary" onclick="AdminOrder.changeStatus('printing')">Druck gestartet</button>`);
                break;
            case 'printing':
                actions.push(`<button class="btn btn-primary" onclick="AdminOrder.changeStatus('done')">Druck fertig</button>`);
                break;
            case 'done':
                actions.push(`<button class="btn btn-primary" onclick="AdminOrder.changeStatus('delivered')">Übergeben</button>`);
                break;
        }

        return actions.join(' ') || '<span class="text-muted">Keine Aktionen verfügbar</span>';
    },

    recalculate() {
        const form = document.getElementById('pricing-form');
        const weight = parseFloat(form.estimated_weight_g?.value) || 0;
        const time = parseFloat(form.estimated_time_min?.value) || 0;
        const pricePerKg = this.order.price_per_kg ? parseFloat(this.order.price_per_kg) : 20;

        // Material cost: weight (g) / 1000 * price per kg
        const matCost = (weight / 1000) * pricePerKg;
        document.getElementById('material_cost').value = matCost.toFixed(2);

        // Electricity cost: time (min) / 60 * wattage (W) / 1000 * rate (EUR/kWh)
        // These would come from settings, use defaults for now
        const wattage = 200;
        const rate = 0.30;
        const elecCost = (time / 60) * (wattage / 1000) * rate;
        document.getElementById('electricity_cost').value = elecCost.toFixed(2);

        // Total
        const total = matCost + elecCost;
        document.getElementById('total_price').value = total.toFixed(2);
    },

    async savePricing(form) {
        const data = {
            estimated_weight_g: form.estimated_weight_g.value || null,
            estimated_time_min: form.estimated_time_min.value || null,
            material_cost: form.material_cost.value || null,
            electricity_cost: form.electricity_cost.value || null,
            total_price: form.total_price.value || null,
            price_note: form.price_note.value,
            admin_notes: form.admin_notes.value,
            is_paid: form.is_paid.checked ? 1 : 0,
        };

        try {
            await API.updateOrder(this.order.id, data);
            showMessage('#pricing-message', 'Gespeichert!', 'success');
            // Refresh
            this.order = await API.getAdminOrder(this.order.id);
        } catch (err) {
            showMessage('#pricing-message', err.message);
        }
    },

    async changeStatus(newStatus) {
        try {
            await API.updateOrder(this.order.id, { status: newStatus });
            this.render(this.order.id);
        } catch (err) {
            showMessage('#action-message', err.message);
        }
    },

    async doSendOffer() {
        if (!this.order.total_price) {
            showMessage('#action-message', 'Bitte zuerst einen Preis festlegen und speichern.');
            return;
        }
        try {
            const result = await API.sendOffer(this.order.id);
            showMessage('#action-message',
                result.email_sent ? 'Angebot gesendet!' : 'Status aktualisiert, aber E-Mail konnte nicht gesendet werden.',
                result.email_sent ? 'success' : 'warning'
            );
            this.render(this.order.id);
        } catch (err) {
            showMessage('#action-message', err.message);
        }
    },

    async doReject() {
        const reason = prompt('Grund für die Ablehnung (optional):');
        if (reason === null) return; // cancelled

        try {
            await API.rejectOrder(this.order.id, reason);
            this.render(this.order.id);
        } catch (err) {
            showMessage('#action-message', err.message);
        }
    },
};
