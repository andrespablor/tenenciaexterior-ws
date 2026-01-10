// ========================================
// SUPABASE-CONFIG.JS - Credenciales
// ========================================

const SUPABASE_CONFIG = {
    url: 'https://wqjnjewadakatnpwfcpf.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxam5qZXdhZGFrYXRucHdmY3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDAwNDEsImV4cCI6MjA4MzU3NjA0MX0.qTJrBdJoS0yWhhpCf0RjUI7v-eHKLPu9S90aQ7HQFi4'
};

// Exponer globalmente
window.SUPABASE_CONFIG = SUPABASE_CONFIG;

console.log('Supabase Config: Loaded');
