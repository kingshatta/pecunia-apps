// Closet — runtime config. Edit this file from the GitHub web editor after
// following DEPLOY.md. Leave the values empty to run in demo mode (no backend,
// no account, seeded closet — everything works offline).
//
// Both values below are PUBLIC and safe to commit: the publishable/anon key is
// client-facing and every table is protected by row-level security. The
// service-role key must NEVER appear in this file or anywhere in this repo.
window.CLOSET_CONFIG = {
  // Supabase Dashboard → Project Settings → API → Project URL
  supabaseUrl: '',
  // Supabase Dashboard → Project Settings → API → publishable/anon public key
  supabaseAnonKey: '',
}
