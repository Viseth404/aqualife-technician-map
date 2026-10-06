// Calls the server function netlify/functions/admin-users.mjs (super admins only).
// Sends the logged-in user's token so the server can check who is asking.
import { supabase } from './supabase';

export async function adminApi(action, payload = {}) {
  const { data } = await supabase.auth.getSession();
  let res;
  try {
    res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token || ''}` },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    throw new Error('No connection. Check your internet and try again.');
  }
  let body = {};
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error('Team management only works on the live site (Netlify), not in local preview.');
    throw new Error(body.error || `Error ${res.status}`);
  }
  return body;
}

// A random password that is easy to read out loud (no 0/O, 1/l/I).
export function generatePassword(length = 12) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => chars[b % chars.length]).join('');
}
