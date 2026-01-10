// ========================================
// AUTH-UI.JS - Manejo de Autenticación
// Versión simplificada: redirige a login.html
// ========================================

// Flag para evitar múltiples cargas de datos
let _authDataLoaded = false;

function initAuthUI() {
    // Inicializar Supabase
    if (!initSupabase()) {
        console.error('❌ No se pudo inicializar Supabase');
        return;
    }

    // Botón de auth en header (para logout)
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        authBtn.addEventListener('click', async () => {
            const user = await getCurrentUser();
            if (user) {
                // Mostrar opción de logout
                if (confirm(`¿Cerrar sesión de ${user.email}?`)) {
                    await signOut();
                    window.location.href = 'login.html';
                }
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    // Listener para cambios de autenticación
    onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth event:', event);

        if (event === 'SIGNED_OUT') {
            // Reset flag y redirigir a login
            _authDataLoaded = false;
            window.location.href = 'login.html';
        } else if (event === 'INITIAL_SESSION' && session?.user && !_authDataLoaded) {
            // Solo cargar datos en INITIAL_SESSION (evita loop)
            _authDataLoaded = true;
            updateAuthButton(session.user);
            console.log('📊 Cargando datos desde Supabase (initial session)...');
            await loadAllDataSupabase();
            if (typeof applySettings === 'function') {
                applySettings();
            }
            if (typeof renderAll === 'function') {
                renderAll();
            }
            console.log('✅ Datos cargados correctamente');
        } else if (event === 'SIGNED_IN' && session?.user) {
            // Solo actualizar botón, datos ya cargados por checkSession o INITIAL_SESSION
            updateAuthButton(session.user);
        }
    });

    // Verificar sesión al cargar
    checkSession();
}

async function checkSession() {
    const session = await getSession();

    if (session?.user) {
        console.log('🔐 Sesión activa:', session.user.email);
        updateAuthButton(session.user);

        // Solo cargar si no se cargaron datos aún
        if (!_authDataLoaded) {
            _authDataLoaded = true;
            console.log('📊 Cargando datos desde Supabase...');
            await loadAllDataSupabase();

            // Aplicar settings
            if (typeof applySettings === 'function') {
                applySettings();
            }

            // Renderizar todo
            if (typeof renderAll === 'function') {
                console.log('🎨 Renderizando interfaz...');
                renderAll();
            }

            console.log('✅ App inicializada correctamente');
        }
    } else {
        console.log('🔐 No hay sesión - redirigiendo a login');
        window.location.href = 'login.html';
    }
}

function updateAuthButton(user) {
    const authBtn = document.getElementById('auth-btn');
    if (authBtn && user) {
        authBtn.innerHTML = '👤';
        authBtn.title = `${user.email} - Click para cerrar sesión`;
        authBtn.classList.add('logged-in');
    }
}

// Exponer globalmente
window.initAuthUI = initAuthUI;
window.checkSession = checkSession;

console.log('Auth UI: Loaded');
