import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Polyfill WebSocket for node environment to prevent Supabase Realtime from failing
(global as any).WebSocket = class {};

dotenv.config({ 
  path: path.resolve(__dirname, '../.env') 
});

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

async function setupStorage() {
  console.log('Using SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  
  // Create avatars bucket
  const { data, error } = await supabase
    .storage
    .createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: [
        'image/jpeg', 
        'image/png', 
        'image/webp'
      ]
    });

  if (error && error.message !== 'Bucket already exists' && !error.message.includes('already exists')) {
    console.error('Error creating bucket:', error);
    return;
  }
  console.log('✅ avatars bucket created/verified');

  // Set bucket policy — public read, auth write
  // Upload a dummy png file to verify write (since text/plain is not allowed)
  const { error: policyError } = await supabase
    .storage
    .from('avatars')
    .upload('test/test.png', new Blob([''], { 
      type: 'image/png' 
    }), { upsert: true });

  if (policyError) {
    console.error('Error uploading test file:', policyError);
  } else {
    console.log('✅ Storage setup complete');
  }
}

setupStorage();
