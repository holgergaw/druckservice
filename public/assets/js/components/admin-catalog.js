/**
 * Admin Katalog-Verwaltung
 */
const AdminCatalog = {
    async render() {
        const isAuth = await API.checkAuth();
        if (!isAuth) { location.hash = '#/admin'; return; }

        const app = document.getElementById('app');
        app.innerHTML = `
            <h2>Katalog verwalten</h2>
            <button class="btn btn-primary" onclick="AdminCatalog.showAddForm()" id="add-btn">+ Neuer Artikel</button>
            <div id="catalog-form-wrap" style="display:none;"></div>
            <div id="catalog-list">Laden...</div>
        `;

        this.loadList();
    },

    async loadList() {
        const wrap = document.getElementById('catalog-list');
        try {
            const items = await API.getAdminCatalog();

            if (items.length === 0) {
                wrap.innerHTML = '<p class="text-muted">Noch keine Katalog-Artikel.</p>';
                return;
            }

            wrap.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr><th>Bild</th><th>Titel</th><th>Material</th><th>Aktiv</th><th></th></tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr class="${!item.is_active ? 'row-inactive' : ''}">
                                <td>
                                    ${item.image_url
                                        ? `<img src="${escHtml(item.image_url)}" class="thumb" alt="">`
                                        : '<span class="text-muted">–</span>'}
                                </td>
                                <td><strong>${escHtml(item.title)}</strong><br><small>${escHtml(item.description || '')}</small></td>
                                <td>${escHtml(item.material_name || '–')}</td>
                                <td>${item.is_active ? 'Ja' : 'Nein'}</td>
                                <td>
                                    <button class="btn btn-sm" onclick="AdminCatalog.showEditForm(${item.id})">Bearbeiten</button>
                                    <label class="btn btn-sm btn-secondary" style="cursor:pointer;">
                                        Bild
                                        <input type="file" accept="image/*" style="display:none;"
                                               onchange="AdminCatalog.uploadImage(${item.id}, this)">
                                    </label>
                                    ${item.is_active
                                        ? `<button class="btn btn-sm btn-danger" onclick="AdminCatalog.toggleActive(${item.id}, 0)">Deaktivieren</button>`
                                        : `<button class="btn btn-sm btn-secondary" onclick="AdminCatalog.toggleActive(${item.id}, 1)">Aktivieren</button>`
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (err) {
            wrap.innerHTML = `<p class="alert alert-error">${escHtml(err.message)}</p>`;
        }
    },

    showAddForm() {
        const wrap = document.getElementById('catalog-form-wrap');
        wrap.style.display = 'block';
        wrap.innerHTML = `
            <div class="card">
                <h3>Neuer Katalog-Artikel</h3>
                <form id="catalog-add-form">
                    <div class="form-group">
                        <label>Titel *</label>
                        <input type="text" name="title" required>
                    </div>
                    <div class="form-group">
                        <label>Beschreibung</label>
                        <textarea name="description" rows="2"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Externer Link</label>
                            <input type="url" name="external_url" placeholder="https://...">
                        </div>
                        <div class="form-group">
                            <label>Sortierung</label>
                            <input type="number" name="sort_order" value="0">
                        </div>
                    </div>
                    <div id="catalog-form-msg"></div>
                    <button type="submit" class="btn btn-primary">Erstellen</button>
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('catalog-form-wrap').style.display='none'">Abbrechen</button>
                </form>
            </div>
        `;

        document.getElementById('catalog-add-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            try {
                await API.createCatalogItem({
                    title: form.title.value,
                    description: form.description.value,
                    external_url: form.external_url.value,
                    sort_order: parseInt(form.sort_order.value) || 0,
                });
                wrap.style.display = 'none';
                this.loadList();
            } catch (err) {
                showMessage('#catalog-form-msg', err.message);
            }
        });
    },

    async showEditForm(id) {
        const wrap = document.getElementById('catalog-form-wrap');
        try {
            const item = await API.getAdminCatalog().then(items => items.find(i => i.id === id));
            if (!item) return;

            wrap.style.display = 'block';
            wrap.innerHTML = `
                <div class="card">
                    <h3>Artikel bearbeiten</h3>
                    <form id="catalog-edit-form">
                        <div class="form-group">
                            <label>Titel *</label>
                            <input type="text" name="title" value="${escHtml(item.title)}" required>
                        </div>
                        <div class="form-group">
                            <label>Beschreibung</label>
                            <textarea name="description" rows="2">${escHtml(item.description || '')}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Externer Link</label>
                                <input type="url" name="external_url" value="${escHtml(item.external_url || '')}">
                            </div>
                            <div class="form-group">
                                <label>Sortierung</label>
                                <input type="number" name="sort_order" value="${item.sort_order || 0}">
                            </div>
                        </div>
                        <div id="catalog-edit-msg"></div>
                        <button type="submit" class="btn btn-primary">Speichern</button>
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('catalog-form-wrap').style.display='none'">Abbrechen</button>
                    </form>
                </div>
            `;

            document.getElementById('catalog-edit-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                try {
                    await API.updateCatalogItem(id, {
                        title: form.title.value,
                        description: form.description.value,
                        external_url: form.external_url.value,
                        sort_order: parseInt(form.sort_order.value) || 0,
                    });
                    wrap.style.display = 'none';
                    this.loadList();
                } catch (err) {
                    showMessage('#catalog-edit-msg', err.message);
                }
            });
        } catch {}
    },

    async uploadImage(id, input) {
        if (!input.files.length) return;
        const formData = new FormData();
        formData.append('image', input.files[0]);

        try {
            await API.uploadCatalogImage(id, formData);
            this.loadList();
        } catch (err) {
            alert('Fehler beim Upload: ' + err.message);
        }
    },

    async toggleActive(id, active) {
        try {
            await API.updateCatalogItem(id, { is_active: active });
            this.loadList();
        } catch (err) {
            alert(err.message);
        }
    },
};
