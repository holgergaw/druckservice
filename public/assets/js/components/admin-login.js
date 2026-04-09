/**
 * Admin Login
 */
const AdminLogin = {
    async render() {
        // Check if already logged in
        const isAuth = await API.checkAuth();
        if (isAuth) {
            location.hash = '#/admin/dashboard';
            return;
        }

        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="card" style="max-width:400px; margin:2rem auto;">
                <h2>Admin Login</h2>
                <form id="login-form">
                    <div class="form-group">
                        <label for="password">Passwort</label>
                        <input type="password" id="password" name="password" required autofocus>
                    </div>
                    <div id="login-message"></div>
                    <button type="submit" class="btn btn-primary">Anmelden</button>
                </form>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const btn = e.target.querySelector('button');
            btn.disabled = true;

            try {
                await API.login(password);
                location.hash = '#/admin/dashboard';
            } catch (err) {
                showMessage('#login-message', err.message);
                btn.disabled = false;
            }
        });
    },
};
