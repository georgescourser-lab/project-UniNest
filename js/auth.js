document.addEventListener('DOMContentLoaded', async () => {
    // Wait for supabaseClient to initialize
    if (!window.supabaseClient) {
        console.error("Supabase client not found.");
        return;
    }

    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    updateNavActions(session);

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        updateNavActions(session);
    });

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            errorDiv.style.display = 'none';

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email, password
            });

            if (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const errorDiv = document.getElementById('signup-error');
            errorDiv.style.display = 'none';

            const { data, error } = await supabaseClient.auth.signUp({
                email, password
            });

            if (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } else {
                alert("Sign up successful! You can now log in.");
                window.location.href = 'login.html'; 
            }
        });
    }
});

function updateNavActions(session) {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    if (session) {
        // User is logged in
        navActions.innerHTML = `
            <span style="margin-right: 1rem; color: var(--color-gray); font-weight: 500;">
               Hi, ${session.user.email.split('@')[0]}
            </span>
            <a href="#" id="logout-btn" class="btn btn-secondary">Logout</a>
        `;
        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            await window.supabaseClient.auth.signOut();
            window.location.reload();
        });
    } else {
        // Not logged in
        navActions.innerHTML = `
            <a href="login.html" class="btn btn-secondary">Log In</a>
            <a href="signup.html" class="btn btn-primary">Sign Up</a>
        `;
    }
}