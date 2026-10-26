const SUPABASE_URL = 'https://yuknsftjeoxifpjqumyk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rubzpKaVlt6MTnDIxEUjow_WaZ2n2Hw';

// Initialize the Supabase client safely with implicit flow support
let supabaseClient = null;
try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                flowType: 'implicit',
                detectSessionInUrl: true,
                persistSession: true,
                autoRefreshToken: true,
                storage: typeof window !== 'undefined' ? window.localStorage : undefined
            }
        });
        window.supabaseClient = supabaseClient;
    }
} catch (e) {
    console.warn('Supabase initialization failed:', e);
}

window.fetchSupabaseData = async function() {
    if (!supabaseClient) return;

    try {
        const [{ data: properties, error: propErr }, { data: agents, error: agentErr }] = await Promise.all([
             supabaseClient.from('properties').select('*'),
             supabaseClient.from('agents').select('*')
        ]);
        
        if (propErr) console.warn('Supabase properties notice:', propErr.message);
        if (agentErr) console.warn('Supabase agents notice:', agentErr.message);

        // Only override properties if valid non-empty data was returned from database
        if (properties && Array.isArray(properties) && properties.length > 0) {
            const mappedProperties = properties.map(p => ({
                id: p.id,
                title: p.title,
                type: p.type,
                rent: p.rent,
                location: p.location,
                distance: p.distance || '1.0 km',
                image: p.image || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
                images: p.images || [p.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'],
                amenities: p.amenities || ['Wi-Fi included', 'Security 24/7'],
                agentId: p.agent_id || 1,
                description: p.description || ''
            }));
            if (!window.uniData) window.uniData = {};
            window.uniData.properties = mappedProperties;
        }

        // Only override agents if valid non-empty data was returned from database
        if (agents && Array.isArray(agents) && agents.length > 0) {
            const mappedAgents = agents.map(a => ({
                id: a.id,
                name: a.name,
                image: a.image ? a.image.replace(/^\//, '') : 'images/agent-1.svg',
                rating: a.rating || 5.0,
                reviews: a.reviews || 0,
                listingsCount: a.listings_count || 5,
                whatsapp: a.whatsapp || '',
                email: a.email || ''
            }));
            if (!window.uniData) window.uniData = {};
            window.uniData.agents = mappedAgents;
        }
    } catch (error) {
        console.warn('Error connecting to remote Supabase, keeping verified local catalog:', error);
    }
};