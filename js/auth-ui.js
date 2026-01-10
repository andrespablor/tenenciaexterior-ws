// ========================================
// AUTH-UI.JS - Manejo de Autenticación
// Versión simplificada: redirige a login.html
// ========================================

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
            // Redirigir a login
            window.location.href = 'login.html';
        } else if (event === 'SIGNED_IN' && session?.user) {
            // Cargar datos desde Supabase
            updateAuthButton(session.user);
            await loadAllDataSupabase();
            if (typeof applySettings === 'function') {
                applySettings();
            }
            if (typeof renderAll === 'function') {
                renderAll();
            }
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

        // Cargar datos desde Supabase
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
