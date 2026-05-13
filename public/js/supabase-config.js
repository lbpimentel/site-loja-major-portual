// Configuração do Supabase para ARLS Major Portugal
const SUPABASE_URL = 'https://dnemzaksujqnywbnfamf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lB9tBZKn3oa9pQykI22ePw_m6FNlq84';

// Inicializa o cliente Supabase (usando a biblioteca via CDN)
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.supabaseClient = _supabase;
