/**
 * Admin Einstellungen — Settings, Materialien, Farben
 */
const AdminSettings = {
    async render() {
        const isAuth = await API.checkAuth();
        if (!isAuth) { location.hash = '#/admin'; return; }

        const app = document.getElementById('app');
        app.innerHTML = `
            <h2>Einstellungen</h2>

            <div class="settings-tabs">
                <button class="tab active" onclick="AdminSettings.showTab('general')">Allgemein</button>
                <button class="tab" onclick="AdminSettings.showTab('materials')">Materialien</button>
                <button class="tab" onclick="AdminSettings.showTab('colors')">Farben</button>
            </div>

            <div id="tab-general" class="settings-content"></div>
            <div id="tab-materials" class="settings-content" style="display:none;"></div>
            <div id="tab-colors" class="settings-content" style="display:none;"></div>
        `;

        this.loadGeneral();
        this.loadMaterials();
        this.loadColors();
    },

    showTab(name) {
        document.querySelectorAll('.settings-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.settings-tabs .tab').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-${name}`).style.display = 'block';
        event.target.classList.add('active');
    },

    // --- General Settings ---
    async loadGeneral() {
        const wrap = document.getElementById('tab-general');
        try {
            const settings = await API.getSettings();
            wrap.innerHTML = `
                <div class="card">
                    <h3>Allgemeine Einstellungen</h3>
                    <form id="settings-form">
                        <div class="form-group">
                            <label>Admin E-Mail (für Benachrichtigungen)</label>
                            <input type="email" name="admin_email" value="${escHtml(settings.admin_email || '')}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Strompreis (EUR/kWh)</label>
                                <input type="number" step="0.01" name="electricity_kwh_rate"
                                       value="${escHtml(settings.electricity_kwh_rate || '0.30')}">
                            </div>
                            <div class="form-group">
                                <label>Drucker-Leistung (Watt)</label>
                                <input type="number" name="printer_wattage"
                                       value="${escHtml(settings.printer_wattage || '200')}">
                            </div>
                        </div>
                        <div id="settings-msg"></div>
                        <button type="submit" class="btn btn-primary">Speichern</button>
                    </form>
                </div>
            `;

            document.getElementById('settings-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                try {
                    await API.updateSettings({
                        admin_email: form.admin_email.value,
                        electricity_kwh_rate: form.electricity_kwh_rate.value,
                        printer_wattage: form.printer_wattage.value,
                    });
                    showMessage('#settings-msg', 'Gespeichert!', 'success');
                } catch (err) {
                    showMessage('#settings-msg', err.message);
                }
            });
        } catch (err) {
            wrap.innerHTML = `<p class="alert alert-error">${escHtml(err.message)}</p>`;
        }
    },

    // --- Materials ---
    async loadMaterials() {
        const wrap = document.getElementById('tab-materials');
        try {
            const materials = await API.getAdminMaterials();
            wrap.innerHTML = `
                <div class="card">
                    <h3>Materialien</h3>
                    <table class="data-table">
                        <thead>
                            <tr><th>Name</th><th>Preis/kg (EUR)</th><th>Aktiv</th><th>Sortierung</th><th></th></tr>
                        </thead>
                        <tbody>
                            ${materials.map(m => `
                                <tr>
                                    <td><input type="text" value="${escHtml(m.name)}" data-id="${m.id}" data-field="name" class="inline-edit"></td>
                                    <td><input type="number" step="0.01" value="${m.price_per_kg}" data-id="${m.id}" data-field="price_per_kg" class="inline-edit" style="width:80px;"></td>
                                    <td>
                                        <input type="checkbox" data-id="${m.id}" data-field="is_active"
                                               ${m.is_active ? 'checked' : ''} onchange="AdminSettings.updateMaterial(${m.id}, 'is_active', this.checked ? 1 : 0)">
                                    </td>
                                    <td><input type="number" value="${m.sort_order}" data-id="${m.id}" data-field="sort_order" class="inline-edit" style="width:60px;"></td>
                                    <td><button class="btn btn-sm" onclick="AdminSettings.saveMaterialRow(${m.id})">Speichern</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="margin-top:1rem;">
                        <h4>Neues Material</h4>
                        <form id="add-material-form" class="form-row">
                            <div class="form-group"><input type="text" name="name" placeholder="Name" required></div>
                            <div class="form-group"><input type="number" step="0.01" name="price_per_kg" placeholder="EUR/kg" required></div>
                            <button type="submit" class="btn btn-primary btn-sm">Hinzufügen</button>
                        </form>
                    </div>
                    <div id="material-msg"></div>
                </div>
            `;

            document.getElementById('add-material-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                try {
                    await API.createMaterial({
                        name: form.name.value,
                        price_per_kg: parseFloat(form.price_per_kg.value),
                    });
                    this.loadMaterials();
                } catch (err) {
                    showMessage('#material-msg', err.message);
                }
            });
        } catch {}
    },

    async saveMaterialRow(id) {
        const data = {};
        document.querySelectorAll(`.inline-edit[data-id="${id}"]`).forEach(input => {
            const field = input.dataset.field;
            data[field] = input.type === 'number' ? parseFloat(input.value) : input.value;
        });
        try {
            await API.updateMaterial(id, data);
            showMessage('#material-msg', 'Gespeichert!', 'success');
        } catch (err) {
            showMessage('#material-msg', err.message);
        }
    },

    async updateMaterial(id, field, value) {
        try {
            await API.updateMaterial(id, { [field]: value });
        } catch (err) {
            alert(err.message);
        }
    },

    // --- Colors ---
    async loadColors() {
        const wrap = document.getElementById('tab-colors');
        try {
            const colors = await API.getAdminColors();
            wrap.innerHTML = `
                <div class="card">
                    <h3>Farben</h3>
                    <table class="data-table">
                        <thead>
                            <tr><th>Vorschau</th><th>Name</th><th>Hex-Code</th><th>Aktiv</th><th>Sort.</th><th></th></tr>
                        </thead>
                        <tbody>
                            ${colors.map(c => `
                                <tr>
                                    <td><span class="color-dot big" style="background:${c.hex_code || '#ccc'}"></span></td>
                                    <td><input type="text" value="${escHtml(c.name)}" data-cid="${c.id}" data-field="name" class="color-edit"></td>
                                    <td><input type="color" value="${c.hex_code || '#000000'}" data-cid="${c.id}" data-field="hex_code" class="color-edit"></td>
                                    <td>
                                        <input type="checkbox" data-cid="${c.id}" ${c.is_active ? 'checked' : ''}
                                               onchange="AdminSettings.updateColor(${c.id}, 'is_active', this.checked ? 1 : 0)">
                                    </td>
                                    <td><input type="number" value="${c.sort_order}" data-cid="${c.id}" data-field="sort_order" class="color-edit" style="width:60px;"></td>
                                    <td><button class="btn btn-sm" onclick="AdminSettings.saveColorRow(${c.id})">Speichern</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="margin-top:1rem;">
                        <h4>Neue Farbe</h4>
                        <form id="add-color-form" class="form-row">
                            <div class="form-group"><input type="text" name="name" placeholder="Name" required></div>
                            <div class="form-group"><input type="color" name="hex_code" value="#000000"></div>
                            <button type="submit" class="btn btn-primary btn-sm">Hinzufügen</button>
                        </form>
                    </div>
                    <div id="color-msg"></div>
                </div>
            `;

            document.getElementById('add-color-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                try {
                    await API.createColor({
                        name: form.name.value,
                        hex_code: form.hex_code.value,
                    });
                    this.loadColors();
                } catch (err) {
                    showMessage('#color-msg', err.message);
                }
            });
        } catch {}
    },

    async saveColorRow(id) {
        const data = {};
        document.querySelectorAll(`.color-edit[data-cid="${id}"]`).forEach(input => {
            const field = input.dataset.field;
            data[field] = input.type === 'number' ? parseInt(input.value) : input.value;
        });
        try {
            await API.updateColor(id, data);
            showMessage('#color-msg', 'Gespeichert!', 'success');
            this.loadColors(); // Refresh preview dots
        } catch (err) {
            showMessage('#color-msg', err.message);
        }
    },

    async updateColor(id, field, value) {
        try {
            await API.updateColor(id, { [field]: value });
        } catch (err) {
            alert(err.message);
        }
    },
};
