/* ============================================================
   PawMatch — Supabase client + data helpers
   Loaded once per page (before auth.js). Exposes window.PawDB.
   ============================================================ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = 'https://deztdviicpzlilmchkcu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlenRkdmlpY3B6bGlsbWNoa2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzQ3OTQsImV4cCI6MjA5NDc1MDc5NH0.8_HZopbXr1W0lcqMCnunTBYszwYrwB-M5Z84N-BwSYc';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'pm-supabase-auth',
  }
});

/* ============= AUTH ============= */
export async function signInWithGoogle(intent){
  const params = new URLSearchParams();
  if(intent === 'breeder') params.set('intent','breeder');
  const redirectTo = window.location.origin + window.location.pathname + (params.toString() ? '?'+params.toString() : '');
  return await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, queryParams: { prompt: 'select_account' } }
  });
}

export async function signInWithEmail(email, password){
  return await sb.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password, fullName, role){
  return await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email.split('@')[0],
        role: role || 'seeker',
        language: (localStorage.getItem('pm-lang') || 'en'),
      }
    }
  });
}

export async function signOut(){
  await sb.auth.signOut();
  localStorage.removeItem('pm-user');
  localStorage.removeItem('pm-role');
}

export async function getCurrentUser(){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) return null;
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return { ...user, profile };
}

export async function updateProfile(updates){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Not signed in');
  return await sb.from('profiles').update(updates).eq('id', user.id);
}

/* ============= DATA LOADERS ============= */
export async function loadBreeds(species){
  let q = sb.from('breeds').select('*');
  if(species) q = q.eq('species', species);
  return await q.order('slug');
}

export async function loadPets(filters = {}){
  let q = sb.from('pets')
    .select(`
      *,
      breed:breeds(id, slug, name, species),
      breeder:breeder_profiles!pets_breeder_id_fkey(user_id, farm_name, slug, region, province)
    `)
    .eq('status', 'available');
  if(filters.species)        q = q.eq('breed.species', filters.species);
  if(filters.maxPrice)       q = q.lte('price', filters.maxPrice);
  if(filters.minPrice)       q = q.gte('price', filters.minPrice);
  if(filters.breederId)      q = q.eq('breeder_id', filters.breederId);
  if(filters.kidFriendly)    q = q.eq('kid_friendly', true);
  if(filters.hypoallergenic) q = q.eq('hypoallergenic', true);
  if(filters.apartment)      q = q.eq('apartment_friendly', true);
  q = q.order('published_at', { ascending: false, nullsFirst: false });
  return await q;
}

export async function loadPet(petId){
  return await sb.from('pets')
    .select(`
      *,
      breed:breeds(*),
      breeder:breeder_profiles!pets_breeder_id_fkey(*, profile:profiles(full_name, avatar_url)),
      pedigree:pedigree_records(*),
      health:health_records(*)
    `)
    .eq('id', petId)
    .single();
}

export async function loadBreeders(filters = {}){
  let q = sb.from('breeder_profiles')
    .select(`
      *,
      profile:profiles!breeder_profiles_user_id_fkey(full_name, avatar_url)
    `)
    .eq('verification_status', 'verified');
  if(filters.species)   q = q.contains('specialty_species', [filters.species]);
  if(filters.region)    q = q.eq('region', filters.region);
  if(filters.minRating) q = q.gte('rating_avg', filters.minRating);
  if(filters.badge)     q = q.contains('badges', [filters.badge]);
  q = q.order('rating_avg', { ascending: false, nullsFirst: false });
  return await q;
}

export async function loadBreeder(slugOrId){
  // Try slug first, then ID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(slugOrId);
  return await sb.from('breeder_profiles')
    .select(`*, profile:profiles!breeder_profiles_user_id_fkey(full_name, avatar_url, bio)`)
    .eq(isUuid ? 'user_id' : 'slug', slugOrId)
    .single();
}

/* ============= QUIZ ============= */
export async function saveQuizResponse(answers, archetype, typeScores, recommendedBreedIds){
  const { data: { user } } = await sb.auth.getUser();
  return await sb.from('quiz_responses').insert({
    user_id: user?.id || null,
    session_id: getOrCreateSessionId(),
    answers,
    archetype,
    type_scores: typeScores,
    recommended_breed_ids: recommendedBreedIds || null,
  }).select().single();
}

export async function loadMyQuizHistory(){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) return { data: [] };
  return await sb.from('quiz_responses')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false });
}

/* ============= FAVORITES ============= */
export async function toggleFavorite(petId){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Sign in required to save favorites');
  const { data: existing } = await sb.from('favorites')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('pet_id', petId)
    .maybeSingle();
  if(existing){
    await sb.from('favorites').delete().eq('user_id', user.id).eq('pet_id', petId);
    return { favorited: false };
  }
  await sb.from('favorites').insert({ user_id: user.id, pet_id: petId });
  return { favorited: true };
}

export async function loadFavorites(){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) return { data: [] };
  return await sb.from('favorites')
    .select('pet:pets(*, breed:breeds(name), breeder:breeder_profiles(farm_name))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
}

/* ============= INQUIRIES & MESSAGES ============= */
export async function createOrGetInquiry(petId, breederId){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Sign in required');
  const { data: existing } = await sb.from('inquiries')
    .select('*')
    .eq('pet_id', petId).eq('seeker_id', user.id)
    .maybeSingle();
  if(existing) return { data: existing };
  return await sb.from('inquiries').insert({
    pet_id: petId, seeker_id: user.id, breeder_id: breederId,
  }).select().single();
}

export async function sendMessage(inquiryId, body, attachments){
  const { data: { user } } = await sb.auth.getUser();
  return await sb.from('messages').insert({
    inquiry_id: inquiryId, sender_id: user.id, body, attachments: attachments || null,
  }).select().single();
}

export async function loadMessages(inquiryId){
  return await sb.from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
    .eq('inquiry_id', inquiryId)
    .order('sent_at');
}

/* Realtime channel for an inquiry's messages */
export function subscribeMessages(inquiryId, onMessage){
  const ch = sb.channel(`inquiry:${inquiryId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `inquiry_id=eq.${inquiryId}` },
      payload => onMessage(payload.new))
    .subscribe();
  return () => sb.removeChannel(ch);
}

/* ============= STORAGE ============= */
export async function uploadFile(bucket, path, file, opts = {}){
  const { data, error } = await sb.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: opts.upsert ?? false, contentType: file.type });
  if(error) return { error };
  const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(path);
  return { data: { path: data.path, publicUrl } };
}

export async function uploadPetPhoto(petId, file){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Sign in required');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${user.id}/${petId}/${crypto.randomUUID()}.${ext}`;
  return await uploadFile('pet-photos', path, file);
}

export async function uploadBreederPhoto(file, category){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Sign in required');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${user.id}/${category || 'gallery'}/${crypto.randomUUID()}.${ext}`;
  return await uploadFile('breeder-photos', path, file);
}

export async function uploadAvatar(file){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Sign in required');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${user.id}/profile.${ext}`;
  const result = await uploadFile('avatars', path, file, { upsert: true });
  if(result.data){
    await updateProfile({ avatar_url: result.data.publicUrl });
  }
  return result;
}

export async function uploadPrivateDoc(bucket, petId, file, label){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Sign in required');
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
  const path = `${user.id}/${petId}/${label || crypto.randomUUID()}.${ext}`;
  return await uploadFile(bucket, path, file);
}

export async function getSignedUrl(bucket, path, expiresIn = 300){
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresIn);
  return { data: data?.signedUrl, error };
}

/* ============= REFERRALS ============= */
export async function createReferralCode(){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Sign in required');
  const code = 'PAW' + Math.random().toString(36).slice(2, 7).toUpperCase();
  const { data, error } = await sb.from('referrals').insert({
    code, inviter_id: user.id
  }).select().single();
  if(error) return { error };
  return { data, shareUrl: `${window.location.origin}/?ref=${code}` };
}

export async function claimReferral(code){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) throw new Error('Sign in required');
  return await sb.from('referrals')
    .update({ invitee_id: user.id, status: 'claimed', claimed_at: new Date().toISOString() })
    .eq('code', code)
    .is('invitee_id', null)
    .select().single();
}

/* ============= UTIL ============= */
function getOrCreateSessionId(){
  let id = localStorage.getItem('pm-session-id');
  if(!id){ id = crypto.randomUUID(); localStorage.setItem('pm-session-id', id); }
  return id;
}

/* ============= AUTH STATE BROADCAST ============= */
sb.auth.onAuthStateChange((event, session) => {
  if(event === 'SIGNED_IN' && session?.user){
    window.dispatchEvent(new CustomEvent('pm:auth', { detail: { event, user: session.user }}));
  } else if(event === 'SIGNED_OUT'){
    window.dispatchEvent(new CustomEvent('pm:auth', { detail: { event }}));
  } else if(event === 'TOKEN_REFRESHED' && session?.user){
    window.dispatchEvent(new CustomEvent('pm:auth', { detail: { event, user: session.user }}));
  }
});

/* Expose global */
window.PawDB = {
  sb,
  signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, getCurrentUser, updateProfile,
  loadBreeds, loadPets, loadPet, loadBreeders, loadBreeder,
  saveQuizResponse, loadMyQuizHistory,
  toggleFavorite, loadFavorites,
  createOrGetInquiry, sendMessage, loadMessages, subscribeMessages,
  uploadFile, uploadPetPhoto, uploadBreederPhoto, uploadAvatar, uploadPrivateDoc, getSignedUrl,
  createReferralCode, claimReferral,
};
