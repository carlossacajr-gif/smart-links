import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Superbase URL or Anon Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function injectClicks() {
  const { data: link, error: errLink } = await supabase.from('links').select('id').limit(1).single();

  if (!link) {
    console.log("No links found");
    return;
  }

  const clicks = [
    { link_id: link.id, user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15", os: "iOS", device_type: "Mobile", country: "ES", city: "Madrid", referer: "https://instagram.com" },
    { link_id: link.id, user_agent: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)", os: "iOS", device_type: "Tablet", country: "ES", city: "Barcelona", referer: "Direct" },
    { link_id: link.id, user_agent: "Mozilla/5.0 (Linux; Android 14; SM-S918B)", os: "Android", device_type: "Mobile", country: "MX", city: "CDMX", referer: "https://x.com" },
    { link_id: link.id, user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", os: "macOS", device_type: "Desktop", country: "US", city: "New York", referer: "https://youtube.com" },
    { link_id: link.id, user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", os: "Windows", device_type: "Desktop", country: "AR", city: "Buenos Aires", referer: "https://linkedin.com" }
  ];

  const { data, error } = await supabase.from('clicks').insert(clicks);
  if (error) console.log("Error inserting:", error);
  else console.log("Inserted 5 rich clicks into", link.id);
}

injectClicks();
