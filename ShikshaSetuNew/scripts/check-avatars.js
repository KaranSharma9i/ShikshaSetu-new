global.WebSocket = class {}; // Mock WebSocket to prevent crash in Node.js

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function checkAvatars() {
  console.log("Fetching folders in avatars bucket...");
  const { data: userDirs, error: listError } = await supabase.storage.from('avatars').list('', {
    limit: 100
  });

  if (listError) {
    console.error("Error listing avatars root:", listError.message);
    return;
  }

  for (const dir of userDirs) {
    if (dir.metadata === null || dir.name.includes('.')) {
      continue;
    }
    const { data: files, error: filesError } = await supabase.storage.from('avatars').list(dir.name);
    if (filesError) {
      console.error(`Error listing contents of ${dir.name}:`, filesError.message);
      continue;
    }
    console.log(`Contents of folder "${dir.name}":`, files.map(f => ({
      name: f.name,
      size: f.metadata ? f.metadata.size : 'unknown',
      mimetype: f.metadata ? f.metadata.mimetype : 'unknown',
      last_modified: f.metadata ? f.metadata.lastModified : 'unknown'
    })));
  }
}

checkAvatars();
