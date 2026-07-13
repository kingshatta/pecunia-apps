// The Sho — runtime config. Edit this file from the GitHub web editor after
// following DEPLOY.md. Leave values empty to run in demo mode (no backend).
// All three values below are PUBLIC (safe to commit): the publishable/anon key
// is client-facing, and vapidPublicKey is the public half of the VAPID pair
// (its private half lives only in the function's VAPID_KEYS secret).
window.SHO_CONFIG = {
  // Supabase Dashboard → Project Settings → API → Project URL
  supabaseUrl: 'https://jehsflkioicahjeigqst.supabase.co',
  // Supabase Dashboard → Project Settings → API → publishable/anon public key (safe to expose)
  supabaseAnonKey: 'sb_publishable_wI4Li2NK35_f8WRM51Me0w_JB9qMRbF',
  // Public half of the VAPID key pair (matches the VAPID_KEYS secret in the push function)
  vapidPublicKey: 'BMzugq26RyZvr4QjUQ_ONIKMBAtjOWKJs3SImgKfsDdTaWv6-6BF6Tu56-_OvM1XbBfGBzEVhyutmqKiynRHusI',
}
