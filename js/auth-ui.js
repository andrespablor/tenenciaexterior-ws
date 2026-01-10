// ========================================
// AUTH-UI.JS - Manejo de UI de Autenticación
// ========================================

let isLoginMode = true;

function initAuthUI() {
    // Inicializar Supabase
    if (!initSupabase()) {
        console.error('❌ No se pudo inicializar Supabase');
        return;
    }

    // Referencias a elementos
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authSwitchBtn = document.getElementById('auth-switch-btn');
    const closeAuthBtn = document.getElementById('close-auth-modal');
    const logoutBtn = document.getElementById('logout-btn');
    const authBtn = document.getElementById('auth-btn');

    // Event: Abrir modal de auth
    if (authBtn) {
        authBtn.addEventListener('click', () => {
            console.log('🔐 Auth button clicked');
            openAuthModal();
        });
    }

    // Event: Cerrar modal (solo si ya está logueado)
    if (closeAuthBtn) {
        closeAuthBtn.addEventListener('click', async () => {
            const user = await getCurrentUser();
            if (user) {
                closeAuthModal();
            } else {
                // No permitir cerrar si no está logueado
                showAuthError('Necesitás iniciar sesión para continuar');
            }
        });
    }

    // Event: Click fuera del modal (solo cerrar si está logueado)
    if (authModal) {
        authModal.addEventListener('click', async (e) => {
            if (e.target === authModal) {
                const user = await getCurrentUser();
                if (user) {
                    closeAuthModal();
                }
            }
        });
    }

    // Event: Switch login/register
    if (authSwitchBtn) {
        authSwitchBtn.addEventListener('click', toggleAuthMode);
    }

    // Event: Submit form
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }

    // Event: Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Listener para cambios de autenticación
    onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth event:', event);

        if (event === 'SIGNED_IN' && session?.user) {
            // Usuario logueado - mostrar app
            updateAuthUI(session.user);
            closeAuthModal();
            showAppContent();

            // Cargar datos desde Supabase
            await loadAllDataSupabase();
            if (typeof renderAll === 'function') {
                renderAll();
            }

            if (typeof showToast === 'function') {
                showToast(`✅ Bienvenido, ${session.user.email}`, 'success');
            }
        } else if (event === 'SIGNED_OUT') {
            // Usuario deslogueado - ocultar app, mostrar login
            updateAuthUI(null);
            hideAppContent();
            openAuthModal();

            if (typeof showToast === 'function') {
                showToast('👋 Sesión cerrada', 'info');
            }
        }
    });

    // Verificar sesión existente al cargar
    checkExistingSession();
}

async function checkExistingSession() {
    const session = await getSession();

    if (session?.user) {
        console.log('🔐 Sesión existente encontrada:', session.user.email);
        updateAuthUI(session.user);
        showAppContent();

        // Cargar datos desde Supabase
        await loadAllDataSupabase();
        if (typeof renderAll === 'function') {
            renderAll();
        }
    } else {
        console.log('🔐 No hay sesión - mostrando login');
        hideAppContent();
        openAuthModal();
    }
}

function showAppContent() {
    const appContainer = document.querySelector('.app-container');
    const sidebar = document.querySelector('.sidebar');

    if (appContainer) appContainer.style.display = '';
    if (sidebar) sidebar.style.display = '';

    document.body.classList.remove('auth-required');
}

function hideAppContent() {
    const appContainer = document.querySelector('.app-container');
    const sidebar = document.querySelector('.sidebar');

    if (appContainer) appContainer.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';

    document.body.classList.add('auth-required');
}

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Verificar si ya hay usuario logueado
        getCurrentUser().then(user => {
            if (user) {
                showLoggedInState(user);
            } else {
                showLoginForm();
            }
        });
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    updateAuthFormLabels();
}

function updateAuthFormLabels() {
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const switchBtn = document.getElementById('auth-switch-btn');

    if (isLoginMode) {
        if (title) title.textContent = '🔐 Iniciar Sesión';
        if (submitBtn) submitBtn.textContent = 'Ingresar';
        if (switchText) switchText.textContent = '¿No tenés cuenta?';
        if (switchBtn) switchBtn.textContent = 'Registrate';
    } else {
        if (title) title.textContent = '📝 Crear Cuenta';
        if (submitBtn) submitBtn.textContent = 'Registrarse';
        if (switchText) switchText.textContent = '¿Ya tenés cuenta?';
        if (switchBtn) switchBtn.textContent = 'Iniciá sesión';
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const submitBtn = document.getElementById('auth-submit-btn');

    // Validaciones
    if (!email || !password) {
        showAuthError('Por favor completá todos los campos');
        return;
    }

    if (password.length < 6) {
        showAuthError('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    // Mostrar loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Procesando...';
    hideAuthError();

    try {
        let result;
        if (isLoginMode) {
            result = await signIn(email, password);
        } else {
            result = await signUp(email, password);
        }

        if (result.success) {
            if (!isLoginMode && !result.session) {
                // Registro exitoso pero necesita confirmación
                showAuthError('✅ Cuenta creada. Revisá tu email para confirmar.', 'success');
                submitBtn.disabled = false;
                submitBtn.textContent = isLoginMode ? 'Ingresar' : 'Registrarse';
            }
            // El listener onAuthStateChange manejará el resto
        } else {
            showAuthError(translateAuthError(result.error));
            submitBtn.disabled = false;
            submitBtn.textContent = isLoginMode ? 'Ingresar' : 'Registrarse';
        }
    } catch (error) {
        showAuthError('Error inesperado. Intentá de nuevo.');
        submitBtn.disabled = false;
        submitBtn.textContent = isLoginMode ? 'Ingresar' : 'Registrarse';
    }
}

async function handleLogout() {
    const result = await signOut();
    if (result.success) {
        // Limpiar datos locales
        movements = [];
        dailyStats = [...DEFAULT_DAILY_STATS];
        watchlists = { default: { displayName: 'Mi Watchlist', icon: '📋', symbols: [] } };
        currentWatchlistId = 'default';
        priceAlerts = [];

        // El listener onAuthStateChange manejará mostrar el login
    }
}

function updateAuthUI(user) {
    const authBtn = document.getElementById('auth-btn');
    const authForm = document.getElementById('auth-form');
    const authSwitch = document.querySelector('.auth-switch');
    const userInfo = document.getElementById('auth-user-info');
    const userEmail = document.getElementById('logged-user-email');

    if (user) {
        // Usuario logueado
        if (authBtn) {
            authBtn.innerHTML = '👤';
            authBtn.title = user.email;
            authBtn.classList.add('logged-in');
        }
        if (authForm) authForm.style.display = 'none';
        if (authSwitch) authSwitch.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            if (userEmail) userEmail.textContent = user.email;
        }
    } else {
        // No logueado
        if (authBtn) {
            authBtn.innerHTML = '🔐';
            authBtn.title = 'Iniciar sesión';
            authBtn.classList.remove('logged-in');
        }
        if (authForm) authForm.style.display = 'block';
        if (authSwitch) authSwitch.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
    }
}

function showLoginForm() {
    const authForm = document.getElementById('auth-form');
    const authSwitch = document.querySelector('.auth-switch');
    const userInfo = document.getElementById('auth-user-info');

    if (authForm) authForm.style.display = 'block';
    if (authSwitch) authSwitch.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';

    isLoginMode = true;
    updateAuthFormLabels();
    hideAuthError();
}

function showLoggedInState(user) {
    const authForm = document.getElementById('auth-form');
    const authSwitch = document.querySelector('.auth-switch');
    const userInfo = document.getElementById('auth-user-info');
    const userEmail = document.getElementById('logged-user-email');

    if (authForm) authForm.style.display = 'none';
    if (authSwitch) authSwitch.style.display = 'none';
    if (userInfo) {
        userInfo.style.display = 'flex';
        if (userEmail) userEmail.textContent = user.email;
    }
}

function showAuthError(message, type = 'error') {
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = `auth-error ${type}`;
    }
}

function hideAuthError() {
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function translateAuthError(error) {
    const translations = {
        'Invalid login credentials': 'Email o contraseña incorrectos',
        'Email not confirmed': 'Necesitás confirmar tu email primero',
        'User already registered': 'Este email ya está registrado',
        'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
        'Unable to validate email address: invalid format': 'Formato de email inválido',
        'Email rate limit exceeded': 'Demasiados intentos. Esperá un momento.',
        'Signup requires a valid password': 'Ingresá una contraseña válida'
    };

    return translations[error] || error || 'Error desconocido';
}

// Exponer funciones globalmente
window.initAuthUI = initAuthUI;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;

console.log('Auth UI: Loaded');
