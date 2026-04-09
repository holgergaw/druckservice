/**
 * Status-Seite — Magic Link Ansicht für Kunden
 */
const OrderStatus = {
    async render(orderNumber) {
        const app = document.getElementById('app');
        const token = App.queryParams?.token || '';

        if (!token) {
            app.innerHTML = `
                <div class="card">
                    <h2>Auftragsstatus</h2>
                    <p>Kein gültiger Zugangslink. Bitte nutze den Link aus deiner E-Mail.</p>
                </div>
            `;
            return;
        }

        app.innerHTML = '<div class="card"><p>Status wird geladen...</p></div>';

        try {
            const order = await API.getOrderStatus(orderNumber, token);
            this.renderOrder(order, token);
        } catch (err) {
            app.innerHTML = `
                <div class="card">
                    <h2>Fehler</h2>
                    <p>${escHtml(err.message)}</p>
                    <a href="#/" class="btn btn-secondary">Zurück zur Startseite</a>
                </div>
            `;
        }
    },

    renderOrder(order, token) {
        const app = document.getElementById('app');
        const canRespond = order.status === 'offered';

        app.innerHTML = `
            <div class="card">
                <h2>Auftrag ${escHtml(order.order_number)}</h2>

                <div class="status-display">
                    ${statusBadge(order.status)}
                    ${order.is_paid ? '<span class="badge badge-paid">Bezahlt</span>' : ''}
                </div>

                <div class="order-details">
                    <div class="detail-row">
                        <span class="detail-label">Modell:</span>
                        <span class="detail-value">
                            ${order.source_type === 'catalog' ? escHtml(order.catalog_title || 'Katalog-Artikel') : ''}
                            ${order.source_type === 'upload' ? escHtml(order.upload_original_name || 'Hochgeladene Datei') : ''}
                            ${order.source_type === 'link' ? `<a href="${escHtml(order.external_url)}" target="_blank" rel="noopener">Externer Link</a>` : ''}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Anzahl:</span>
                        <span class="detail-value">${order.quantity}</span>
                    </div>
                    ${order.material_name ? `
                    <div class="detail-row">
                        <span class="detail-label">Material:</span>
                        <span class="detail-value">${escHtml(order.material_name)}</span>
                    </div>` : ''}
                    ${order.color_name ? `
                    <div class="detail-row">
                        <span class="detail-label">Farbe:</span>
                        <span class="detail-value">
                            ${order.hex_code ? `<span class="color-dot" style="background:${order.hex_code}"></span>` : ''}
                            ${escHtml(order.color_name)}
                        </span>
                    </div>` : ''}
                    ${order.customer_notes ? `
                    <div class="detail-row">
                        <span class="detail-label">Anmerkungen:</span>
                        <span class="detail-value">${escHtml(order.customer_notes)}</span>
                    </div>` : ''}
                </div>

                ${order.total_price !== null ? `
                <div class="price-display">
                    <h3>Preis: ${formatPrice(order.total_price)}</h3>
                    ${order.price_note ? `<p class="text-muted">${escHtml(order.price_note)}</p>` : ''}
                </div>
                ` : ''}

                ${canRespond ? `
                <div class="action-buttons" id="response-buttons">
                    <button class="btn btn-primary btn-lg" onclick="OrderStatus.respond('accept', '${order.order_number}', '${token}')">
                        Angebot annehmen
                    </button>
                    <button class="btn btn-danger" onclick="OrderStatus.respond('decline', '${order.order_number}', '${token}')">
                        Ablehnen
                    </button>
                </div>
                <div id="response-message"></div>
                ` : ''}

                <div class="timeline">
                    <h3>Verlauf</h3>
                    ${this.renderTimeline(order)}
                </div>

                <p style="margin-top:2rem;"><a href="#/" class="btn btn-secondary">Zurück zur Startseite</a></p>
            </div>
        `;
    },

    renderTimeline(order) {
        const events = [];
        if (order.created_at) events.push({ date: order.created_at, label: 'Anfrage erstellt' });
        if (order.offered_at) events.push({ date: order.offered_at, label: 'Angebot gesendet' });
        if (order.accepted_at) events.push({ date: order.accepted_at, label: 'Angebot angenommen' });
        if (order.completed_at) events.push({ date: order.completed_at, label: 'Druck fertig' });
        if (order.delivered_at) events.push({ date: order.delivered_at, label: 'Übergeben' });

        if (order.status === 'rejected') events.push({ date: null, label: 'Abgelehnt' });
        if (order.status === 'cancelled') events.push({ date: null, label: 'Storniert' });

        return `<ul class="timeline-list">
            ${events.map(e => `
                <li class="timeline-item">
                    <span class="timeline-date">${formatDate(e.date)}</span>
                    <span class="timeline-label">${escHtml(e.label)}</span>
                </li>
            `).join('')}
        </ul>`;
    },

    async respond(action, orderNumber, token) {
        const btns = document.getElementById('response-buttons');
        const msgEl = document.getElementById('response-message');
        btns.querySelectorAll('button').forEach(b => b.disabled = true);

        try {
            if (action === 'accept') {
                await API.acceptOrder(orderNumber, token);
                btns.innerHTML = '<p class="alert alert-success">Angebot angenommen! Du wirst benachrichtigt, wenn der Druck fertig ist.</p>';
            } else {
                await API.declineOrder(orderNumber, token);
                btns.innerHTML = '<p class="alert alert-info">Anfrage storniert.</p>';
            }
        } catch (err) {
            showMessage(msgEl, err.message);
            btns.querySelectorAll('button').forEach(b => b.disabled = false);
        }
    },
};
