document.addEventListener('DOMContentLoaded', () => {
    const preloader = document.getElementById('preloader');
    const loginContainer = document.getElementById('login-container');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // Check existing authentication mapping via backend guards
    fetch('/api/auth/status')
        .then(res => res.json())
        .then(data => {
            // Fake brief delay for visual preloader comfort
            setTimeout(() => {
                if (preloader) {
                    preloader.style.opacity = '0';
                    preloader.style.visibility = 'hidden';
                }
                
                if (data.isAuthenticated) {
                    window.location.href = '/dashboard.html';
                } else {
                    if (loginContainer) {
                        loginContainer.classList.remove('hidden');
                        loginContainer.style.opacity = '1';
                        loginContainer.style.visibility = 'visible';
                    }
                }
            }, 1200);
        })
        .catch(() => {
            if (preloader) preloader.classList.add('hidden');
            if (loginContainer) loginContainer.classList.remove('hidden');
        });

    // Monitor Form Submissions safely
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorMessage) errorMessage.classList.add('hidden');

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    window.location.href = '/dashboard.html';
                } else {
                    if (errorMessage) {
                        errorMessage.textContent = data.error || 'Authentication failure.';
                        errorMessage.classList.remove('hidden');
                    }
                }
            } catch (err) {
                if (errorMessage) {
                    errorMessage.textContent = 'Connection conflict connecting to application service.';
                    errorMessage.classList.remove('hidden');
                }
            }
        });
    }
});