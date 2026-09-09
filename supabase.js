const SUPABASE_URL = "https://pdbvqsuyjblijvubwiph.supabase.co";
const SUPABASE_KEY = "sb_publishable_8DCc8cg3WHp0uR2KcnHCQw_CdhxrkpQ";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

window.supabaseClient = supabaseClient;
