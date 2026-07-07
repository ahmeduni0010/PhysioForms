document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const preloader = document.getElementById('preloader');
    const loginContainer = document.getElementById('login-container');

    // If already logged in, skip login page straight to dashboard
    if (localStorage.getItem('physio_logged_in') === 'true') {
        window.location.href = '/dashboard.html';
        return;
    }

    // Remove preloader smoothly once checked
    if (preloader) {
        preloader.style.opacity = '0';
        preloader.style.visibility = 'hidden';
        setTimeout(() => preloader.classList.add('hidden'), 400);
    }
    if (loginContainer) {
        loginContainer.classList.remove('hidden');
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.classList.add('hidden');

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    // Save login state locally so Vercel serverless state loss doesn't affect us
                    localStorage.setItem('physio_logged_in', 'true');
                    localStorage.setItem('physio_username', username);
                    
                    window.location.href = '/dashboard.html';
                } else {
                    errorMessage.textContent = data.error || 'Invalid credentials.';
                    errorMessage.classList.remove('hidden');
                }
            } catch (err) {
                errorMessage.textContent = 'Server communication error. Please try again.';
                errorMessage.classList.remove('hidden');
            }
        });
    }
});