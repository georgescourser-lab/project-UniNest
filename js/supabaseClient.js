const SUPABASE_URL = 'https://yuknsftjeoxifpjqumyk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rubzpKaVlt6MTnDIxEUjow_WaZ2n2Hw';

// Initialize the Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

window.fetchSupabaseData = async function() {
    try {
        const [{ data: properties, error: propErr }, { data: agents, error: agentErr }] = await Promise.all([
             supabaseClient.from('properties').select('*'),
             supabaseClient.from('agents').select('*')
        ]);
        
        if (propErr) throw propErr;
        if (agentErr) throw agentErr;

        // Since the DB uses snake_case, map to camelCase for the frontend (which main.js expects)
        const mappedProperties = properties.map(p => ({
            id: p.id,
            title: p.title,
            type: p.type,
            rent: p.rent,
            location: p.location,
            distance: p.distance,
            image: p.image,
            images: p.images,
            amenities: p.amenities,
            agentId: p.agent_id,
            description: p.description
        }));

        const mappedAgents = agents.map(a => ({
            id: a.id,
            name: a.name,
            image: a.image,
            rating: a.rating,
            reviews: a.reviews,
            listingsCount: a.listings_count,
            whatsapp: a.whatsapp,
            email: a.email
        }));

        window.uniData = { properties: mappedProperties, agents: mappedAgents };
    } catch (error) {
        console.error('Error fetching from Supabase:', error);
        // Ensure uniData has a fallback struct if fetching fails and it's missing
        if (!window.uniData) {
            window.uniData = { properties: [], agents: [] };
        }
    }
};