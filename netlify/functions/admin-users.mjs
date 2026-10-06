// Staff account management for SUPER ADMINS only.
// Runs on Netlify's servers (never in the browser), because creating and deleting
// accounts needs the Supabase SECRET key.
//
// Netlify > Site configuration > Environment variables (mark as "secret"):
//   SUPABASE_SECRET_KEY   – Supabase > Project Settings > API Keys > Secret key
//                           (or the legacy "service_role" key)
// It also reads VITE_SUPABASE_URL (already set for the website).
//
// Every request must carry the logged-in user's access token. We check that the
// user is a super admin before doing anything.
import { createClient } from '@supabase/supabase-js';

const ROLES = ['superadmin', 'admin', 'sales', 'technician'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Use POST' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    return json(500, { error: 'Server not set up: add SUPABASE_SECRET_KEY in Netlify environment variables, then redeploy.' });
  }
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  // ---- 1. Who is calling? Must be a logged-in super admin. ----
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Not logged in' });
  const { data: who, error: whoErr } = await db.auth.getUser(token);
  if (whoErr || !who?.user) return json(401, { error: 'Not logged in' });
  const me = who.user;
  const { data: myRow } = await db.from('staff').select('role').eq('user_id', me.id).maybeSingle();
  if (myRow?.role !== 'superadmin') return json(403, { error: 'Only a super admin can manage staff' });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Bad request' });
  }
  const { action } = body;

  // Helpers
  const superadminCount = async () => {
    const { count } = await db.from('staff').select('user_id', { count: 'exact', head: true }).eq('role', 'superadmin');
    return count ?? 0;
  };
  const roleOf = async (id) => (await db.from('staff').select('role').eq('user_id', id).maybeSingle()).data?.role ?? null;
  const checkTarget = (id) => {
    if (!UUID.test(id || '')) return 'Invalid user';
    if (id === me.id) return 'You cannot do this to your own account';
    return null;
  };
  // Never leave the app without a super admin.
  const wouldRemoveLastSuper = async (id) => (await roleOf(id)) === 'superadmin' && (await superadminCount()) <= 1;

  try {
    switch (action) {
      // ---- List all accounts with their role ----
      case 'list': {
        const { data: users, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) throw error;
        const { data: staff, error: sErr } = await db.from('staff').select('user_id, role');
        if (sErr) throw sErr;
        const roles = Object.fromEntries(staff.map((s) => [s.user_id, s.role]));
        return json(200, {
          me: me.id,
          users: users.users
            .map((u) => ({
              id: u.id,
              email: u.email,
              role: roles[u.id] ?? null, // null = no access (revoked or never given)
              createdAt: u.created_at,
              lastSignInAt: u.last_sign_in_at,
            }))
            .sort((a, b) => (a.email || '').localeCompare(b.email || '')),
        });
      }

      // ---- Create an account with a role ----
      case 'create': {
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        const role = body.role;
        if (!EMAIL.test(email)) return json(400, { error: 'Enter a valid email' });
        if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });
        if (!ROLES.includes(role)) return json(400, { error: 'Choose a role' });
        const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) return json(400, { error: error.message });
        const { error: sErr } = await db.from('staff').insert({ user_id: data.user.id, email, role });
        if (sErr) {
          await db.auth.admin.deleteUser(data.user.id); // undo, so we don't leave a half-made account
          throw sErr;
        }
        return json(200, { ok: true, id: data.user.id });
      }

      // ---- Change role, or give access back ("restore") ----
      case 'setRole': {
        const problem = checkTarget(body.userId);
        if (problem) return json(400, { error: problem });
        if (!ROLES.includes(body.role)) return json(400, { error: 'Choose a role' });
        if (body.role !== 'superadmin' && (await wouldRemoveLastSuper(body.userId))) {
          return json(400, { error: 'There must always be at least one super admin' });
        }
        const { data: u, error: uErr } = await db.auth.admin.getUserById(body.userId);
        if (uErr || !u?.user) return json(404, { error: 'User not found' });
        const { error } = await db.from('staff').upsert({ user_id: body.userId, email: u.user.email, role: body.role });
        if (error) throw error;
        return json(200, { ok: true });
      }

      // ---- Revoke access (account stays, but can't use the app) ----
      case 'revoke': {
        const problem = checkTarget(body.userId);
        if (problem) return json(400, { error: problem });
        if (await wouldRemoveLastSuper(body.userId)) return json(400, { error: 'There must always be at least one super admin' });
        const { error } = await db.from('staff').delete().eq('user_id', body.userId);
        if (error) throw error;
        return json(200, { ok: true });
      }

      // ---- Set a new password ----
      case 'resetPassword': {
        if (!UUID.test(body.userId || '')) return json(400, { error: 'Invalid user' });
        const password = String(body.password || '');
        if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });
        const { error } = await db.auth.admin.updateUserById(body.userId, { password });
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true });
      }

      // ---- Delete the account completely ----
      case 'delete': {
        const problem = checkTarget(body.userId);
        if (problem) return json(400, { error: problem });
        if (await wouldRemoveLastSuper(body.userId)) return json(400, { error: 'There must always be at least one super admin' });
        const { error } = await db.auth.admin.deleteUser(body.userId); // staff row is removed automatically
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true });
      }

      default:
        return json(400, { error: 'Unknown action' });
    }
  } catch (e) {
    console.error('[admin-users]', action, e);
    return json(500, { error: 'Something went wrong. Try again.' });
  }
};

export const config = { path: '/api/admin-users' };
