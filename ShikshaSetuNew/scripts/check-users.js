global.WebSocket = class {}; // Mock WebSocket to prevent crash in Node.js environment

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

async function check() {
  const email = 'test_admin@gurukulsiksha.edu.in';
  const password = 'Password123!';

  console.log('Attempting to sign up test user...');
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      console.log('SignUp error (user might already exist):', signUpError.message);
    } else {
      console.log('SignUp successful:', signUpData.user?.email);
    }
  } catch (err) {
    console.error('SignUp failed:', err);
  }

  console.log('Attempting to sign in...');
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('SignIn error:', signInError.message);
      return;
    }

    const session = signInData.session;
    console.log('SignIn successful! Authenticated as:', signInData.user?.email);

    // Create a client with the authenticated user's access token
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      }
    });

    const { data: users, error: usersError } = await authSupabase
      .from('users')
      .select('*');

    if (usersError) {
      console.error('Error fetching users as authenticated:', usersError.message);
    } else {
      console.log('Fetched users as authenticated (count):', users?.length);
      console.log('Sample users:', users?.slice(0, 3));
    }
  } catch (err) {
    console.error('Test run failed:', err);
  }
}

check();
