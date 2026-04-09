/**
 * Anfrage-Formular — 3-Tab-Auswahl (Upload / Katalog / Link)
 */
const OrderForm = {
    materials: [],
    colors: [],
    catalogItems: [],
    selectedTab: 'upload',
    selectedCatalogId: null,

    async render() {
        const app = document.getElementById('app');
        app.innerHTML = '<div class="card"><p>Formular wird geladen...</p></div>';

        // Load data in parallel
        const [materials, colors, catalog] = await Promise.all([
            API.getMaterials().catch(() => []),
            API.getColors().catch(() => []),
            API.getCatalog().catch(() => []),
        ]);

        this.materials = materials;
        this.colors = colors;
        this.catalogItems = catalog;

        // Pre-select catalog item from URL
        const preselect = App.queryParams?.catalog;
        if (preselect) {
            this.selectedTab = 'catalog';
            this.selectedCatalogId = parseInt(preselect);
        }

        this.renderForm();
    },

    renderForm() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="card">
                <h2>Neue Druckanfrage</h2>
                <form id="order-form" enctype="multipart/form-data">
                    <!-- Step 1: Contact -->
                    <fieldset>
                        <legend>Deine Kontaktdaten</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="name">Name *</label>
                                <input type="text" id="name" name="name" required>
                            </div>
                            <div class="form-group">
                                <label for="email">E-Mail *</label>
                                <input type="email" id="email" name="email" required>
                            </div>
                            <div class="form-group">
                                <label for="phone">Telefon <small>(optional)</small></label>
                                <input type="tel" id="phone" name="phone">
                            </div>
                        </div>
                    </fieldset>

                    <!-- Step 2: Model Source -->
                    <fieldset>
                        <legend>3D-Modell</legend>
                        <div class="tabs">
                            <button type="button" class="tab ${this.selectedTab === 'upload' ? 'active' : ''}" data-tab="upload">Datei hochladen</button>
                            <button type="button" class="tab ${this.selectedTab === 'catalog' ? 'active' : ''}" data-tab="catalog">Aus Katalog</button>
                            <button type="button" class="tab ${this.selectedTab === 'link' ? 'active' : ''}" data-tab="link">Link einfügen</button>
                        </div>

                        <div class="tab-content" id="tab-upload" style="display:${this.selectedTab === 'upload' ? 'block' : 'none'}">
                            <div class="form-group">
                                <label for="model">3D-Datei auswählen (STL, 3MF, STEP, max. 50 MB)</label>
                                <div class="dropzone" id="dropzone">
                                    <input type="file" id="model" name="model" accept=".stl,.3mf,.step,.stp">
                                    <p>Datei hierher ziehen oder klicken zum Auswählen</p>
                                    <p id="file-name" class="text-muted"></p>
                                </div>
                            </div>
                        </div>

                        <div class="tab-content" id="tab-catalog" style="display:${this.selectedTab === 'catalog' ? 'block' : 'none'}">
                            <div class="catalog-select-grid">
                                ${this.catalogItems.length === 0
                                    ? '<p class="text-muted">Keine Katalog-Artikel verfügbar.</p>'
                                    : this.catalogItems.map(item => `
                                        <label class="catalog-select-item ${this.selectedCatalogId === item.id ? 'selected' : ''}">
                                            <input type="radio" name="catalog_item_id" value="${item.id}"
                                                ${this.selectedCatalogId === item.id ? 'checked' : ''}>
                                            ${item.image_url
                                                ? `<img src="${escHtml(item.image_url)}" alt="${escHtml(item.title)}">`
                                                : '<div class="catalog-img-placeholder small">Kein Bild</div>'
                                            }
                                            <span>${escHtml(item.title)}</span>
                                        </label>
                                    `).join('')
                                }
                            </div>
                        </div>

                        <div class="tab-content" id="tab-link" style="display:${this.selectedTab === 'link' ? 'block' : 'none'}">
                            <div class="form-group">
                                <label for="external_url">Link zum 3D-Modell</label>
                                <input type="url" id="external_url" name="external_url"
                                       placeholder="https://makerworld.com/de/models/...">
                                <small class="text-muted">z.B. von MakerWorld, Printables oder Thingiverse</small>
                            </div>
                        </div>
                    </fieldset>

                    <!-- Step 3: Details -->
                    <fieldset>
                        <legend>Details</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="quantity">Anzahl</label>
                                <input type="number" id="quantity" name="quantity" value="1" min="1" max="100">
                            </div>
                            <div class="form-group">
                                <label for="material_id">Material</label>
                                <select id="material_id" name="material_id">
                                    <option value="">Keine Präferenz</option>
                                    ${this.materials.map(m => `<option value="${m.id}">${escHtml(m.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="color_id">Farbe</label>
                                <select id="color_id" name="color_id">
                                    <option value="">Keine Präferenz</option>
                                    ${this.colors.map(c => `
                                        <option value="${c.id}">
                                            ${escHtml(c.name)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="customer_notes">Anmerkungen <small>(optional)</small></label>
                            <textarea id="customer_notes" name="customer_notes" rows="3"
                                      placeholder="z.B. für Outdoor-Nutzung, muss wasserdicht sein..."></textarea>
                        </div>
                    </fieldset>

                    <div id="form-message"></div>

                    <button type="submit" class="btn btn-primary btn-lg" id="submit-btn">Anfrage absenden</button>
                </form>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
                tab.classList.add('active');
                const tabName = tab.dataset.tab;
                document.getElementById(`tab-${tabName}`).style.display = 'block';
                this.selectedTab = tabName;
            });
        });

        // File dropzone
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('model');
        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    fileInput.files = e.dataTransfer.files;
                    document.getElementById('file-name').textContent = e.dataTransfer.files[0].name;
                }
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) {
                    document.getElementById('file-name').textContent = fileInput.files[0].name;
                }
            });
        }

        // Catalog selection highlighting
        document.querySelectorAll('.catalog-select-item input').forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.catalog-select-item').forEach(el => el.classList.remove('selected'));
                radio.closest('.catalog-select-item').classList.add('selected');
            });
        });

        // Color preview in select
        const colorSelect = document.getElementById('color_id');
        if (colorSelect) {
            colorSelect.addEventListener('change', () => {
                const opt = colorSelect.selectedOptions[0];
                const color = this.colors.find(c => c.id == colorSelect.value);
                colorSelect.style.borderLeftColor = color?.hex_code || '';
                colorSelect.style.borderLeftWidth = color ? '4px' : '';
            });
        }

        // Form submit
        document.getElementById('order-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitOrder();
        });
    },

    async submitOrder() {
        const btn = document.getElementById('submit-btn');
        const msgEl = document.getElementById('form-message');
        btn.disabled = true;
        btn.textContent = 'Wird gesendet...';
        msgEl.innerHTML = '';

        try {
            const formData = new FormData();
            formData.append('name', document.getElementById('name').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('phone', document.getElementById('phone').value);
            formData.append('source_type', this.selectedTab);
            formData.append('quantity', document.getElementById('quantity').value);
            formData.append('material_id', document.getElementById('material_id').value);
            formData.append('color_id', document.getElementById('color_id').value);
            formData.append('customer_notes', document.getElementById('customer_notes').value);

            switch (this.selectedTab) {
                case 'upload':
                    const fileInput = document.getElementById('model');
                    if (!fileInput.files.length) {
                        throw new Error('Bitte wähle eine 3D-Datei aus');
                    }
                    formData.append('model', fileInput.files[0]);
                    break;
                case 'catalog':
                    const selected = document.querySelector('input[name="catalog_item_id"]:checked');
                    if (!selected) {
                        throw new Error('Bitte wähle einen Katalog-Artikel aus');
                    }
                    formData.append('catalog_item_id', selected.value);
                    break;
                case 'link':
                    const url = document.getElementById('external_url').value;
                    if (!url) {
                        throw new Error('Bitte gib einen Link zum 3D-Modell ein');
                    }
                    formData.append('external_url', url);
                    break;
            }

            const result = await API.createOrder(formData);

            // Show success
            document.getElementById('app').innerHTML = `
                <div class="card success-card">
                    <h2>Anfrage erfolgreich gesendet!</h2>
                    <p>Deine Auftragsnummer: <strong>${escHtml(result.order_number)}</strong></p>
                    <p>Du erhältst eine E-Mail, sobald ich deine Anfrage geprüft und ein Angebot erstellt habe.</p>
                    <p>
                        <a href="#/order/${result.order_number}?token=${result.token}" class="btn btn-primary">
                            Status verfolgen
                        </a>
                    </p>
                    <p>
                        <a href="#/" class="btn btn-secondary">Zurück zur Startseite</a>
                    </p>
                </div>
            `;
        } catch (err) {
            showMessage(msgEl, err.message);
            btn.disabled = false;
            btn.textContent = 'Anfrage absenden';
        }
    },
};
