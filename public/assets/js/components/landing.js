/**
 * Landing Page — Startseite mit Katalog-Galerie
 */
const Landing = {
    async render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <section class="hero">
                <h1>3D-Druckservice</h1>
                <p>Du brauchst ein 3D-gedrucktes Teil? Schick mir deine Anfrage und ich drucke es für dich — du zahlst nur die Materialkosten.</p>
                <a href="#/anfrage" class="btn btn-primary btn-lg">Neue Anfrage stellen</a>
            </section>

            <section class="how-it-works">
                <h2>So funktioniert's</h2>
                <div class="steps-grid">
                    <div class="step-card">
                        <div class="step-number">1</div>
                        <h3>Modell wählen</h3>
                        <p>Lade dein eigenes 3D-Modell hoch, wähle aus meinem Katalog oder sende einen Link.</p>
                    </div>
                    <div class="step-card">
                        <div class="step-number">2</div>
                        <h3>Anfrage absenden</h3>
                        <p>Gib deine Wünsche an (Farbe, Material, Menge) und sende die Anfrage ab.</p>
                    </div>
                    <div class="step-card">
                        <div class="step-number">3</div>
                        <h3>Angebot erhalten</h3>
                        <p>Ich prüfe die Machbarkeit und sende dir ein Preisangebot per E-Mail.</p>
                    </div>
                    <div class="step-card">
                        <div class="step-number">4</div>
                        <h3>Abholen</h3>
                        <p>Nach dem Druck kannst du dein Teil bei mir abholen.</p>
                    </div>
                </div>
            </section>

            <section class="catalog-section" id="catalog-section">
                <h2>Katalog</h2>
                <div id="catalog-grid" class="catalog-grid">
                    <p>Katalog wird geladen...</p>
                </div>
            </section>
        `;

        this.loadCatalog();
    },

    async loadCatalog() {
        const grid = document.getElementById('catalog-grid');
        try {
            const items = await API.getCatalog();

            if (items.length === 0) {
                grid.innerHTML = '<p class="text-muted">Noch keine Katalog-Artikel vorhanden.</p>';
                return;
            }

            grid.innerHTML = items.map(item => `
                <div class="catalog-card">
                    ${item.image_url
                        ? `<img src="${escHtml(item.image_url)}" alt="${escHtml(item.title)}" class="catalog-img">`
                        : '<div class="catalog-img-placeholder">Kein Bild</div>'
                    }
                    <div class="catalog-card-body">
                        <h3>${escHtml(item.title)}</h3>
                        ${item.description ? `<p>${escHtml(item.description)}</p>` : ''}
                        ${item.material_name ? `<span class="badge">${escHtml(item.material_name)}</span>` : ''}
                        <a href="#/anfrage?catalog=${item.id}" class="btn btn-sm btn-primary">Anfragen</a>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            grid.innerHTML = `<p class="text-muted">Katalog konnte nicht geladen werden.</p>`;
        }
    },
};
