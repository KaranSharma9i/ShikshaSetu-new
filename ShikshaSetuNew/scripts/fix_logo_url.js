/**
 * One-off script to fix the logo_url for Gurukul Shikshalaya in the live DB.
 * Uses raw fetch against the Supabase REST API (no SDK needed).
 * Run: node scripts/fix_logo_url.js
 */
require("dotenv").config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or key in .env");
  process.exit(1);
}

const NEW_LOGO_URL =
  "https://fsdqlsbdbbfpqzvrptgk.supabase.co/storage/v1/object/public/institution-logos/gurukul.png";

async function fixLogoUrl() {
  const baseUrl = `${supabaseUrl}/rest/v1/institutions`;
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // 1. Read current value
  const readRes = await fetch(`${baseUrl}?name=ilike.*gurukul*&select=id,name,logo_url`, {
    headers,
  });
  const before = await readRes.json();
  console.log("Current institution(s):");
  before.forEach((inst) =>
    console.log(`  ID: ${inst.id} | Name: ${inst.name} | logo_url: ${inst.logo_url}`)
  );

  if (before.length === 0) {
    console.log("No institution matching 'gurukul' found.");
    return;
  }

  // 2. Update logo_url
  const updateRes = await fetch(`${baseUrl}?name=ilike.*gurukul*`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ logo_url: NEW_LOGO_URL }),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.error("Update failed:", updateRes.status, errText);
    process.exit(1);
  }

  const updated = await updateRes.json();
  console.log("\n✅ Updated logo_url successfully:");
  updated.forEach((inst) =>
    console.log(`  ID: ${inst.id} | Name: ${inst.name} | logo_url: ${inst.logo_url}`)
  );
}

fixLogoUrl().catch(console.error);
