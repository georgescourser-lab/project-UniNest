require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: user, error: authError } = await supabase.auth.signInWithPassword({
    email: 'georgescourser@gmail.com', // Use the admin email
    password: 'password123' // Try a dummy password if we don't know it, but we can't easily auth
  });

  // Try to insert a property anonymously just to see the error (likely 42501 or similar)
  const { data, error } = await supabase.from('properties').insert({
    title: 'Test Property',
    type: 'House',
    rent: '1000',
    location: 'Test Location',
    distance: '10 mins',
    description: 'Test description',
    agent_id: 1,
    amenities: ['WiFi'],
    images: [],
    videos: [],
    image: null,
  }).select().single();
  
  console.log('Insert Error:', JSON.stringify(error, null, 2));
}

main();
