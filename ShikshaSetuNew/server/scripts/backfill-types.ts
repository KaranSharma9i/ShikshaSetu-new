import "../config";
import { supabase } from "../config";

function normalizeType(typeStr: string): string {
  if (!typeStr) return typeStr;
  const trimmed = typeStr.trim();
  const upper = trimmed.toUpperCase();
  const mapping: Record<string, string> = {
    'VERY SHORT ANSWER': 'VERY_SHORT',
    'SHORT ANSWER': 'SHORT',
    'LONG ANSWER': 'LONG',
    'VERY SHORT': 'VERY_SHORT',
    'ASSERTION REASON': 'ASSERTION_REASON',
    'CASE STUDY': 'CASE_STUDY',
  };
  return mapping[upper] || upper;
}

async function run() {
  const targetHwId = process.argv[2];

  console.log("Starting type normalization backfill process...");
  if (targetHwId) {
    console.log(`Targeting specific homework ID: ${targetHwId}`);
  }

  const query = supabase
    .from("homework")
    .select("id, title, generated_content");
  
  if (targetHwId) {
    query.eq("id", targetHwId);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("Failed to query homework records:", error);
    process.exit(1);
  }

  console.log(`Retrieved ${rows.length} homework records to check.`);

  let updatedCount = 0;

  for (const row of rows) {
    if (!row.generated_content) continue;

    let content: any;
    try {
      content = typeof row.generated_content === "string"
        ? JSON.parse(row.generated_content)
        : row.generated_content;
    } catch (err) {
      console.error(`Skipping homework ${row.id}: Failed to parse JSON generated_content.`);
      continue;
    }

    if (!content || !Array.isArray(content.questions)) continue;

    let isModified = false;

    content.questions.forEach((q: any) => {
      const origType = q.type;
      const normType = normalizeType(origType);
      if (origType !== normType) {
        console.log(`  Homework ${row.id} Q${q.question_number}: type "${origType}" -> "${normType}"`);
        q.type = normType;
        isModified = true;
      }

      if (q.sub_questions && Array.isArray(q.sub_questions)) {
        q.sub_questions.forEach((sub: any) => {
          const origSubType = sub.type;
          const normSubType = normalizeType(origSubType);
          if (origSubType !== normSubType) {
            console.log(`  Homework ${row.id} SubQ${sub.question_number}: type "${origSubType}" -> "${normSubType}"`);
            sub.type = normSubType;
            isModified = true;
          }
        });
      }
    });

    if (isModified) {
      console.log(`Updating homework ID: ${row.id} ("${row.title}")`);
      const { error: updateError } = await supabase
        .from("homework")
        .update({ generated_content: content })
        .eq("id", row.id);

      if (updateError) {
        console.error(`Failed to update homework ${row.id}:`, updateError);
      } else {
        console.log(`Successfully normalized types for homework ${row.id}!`);
        updatedCount++;
      }
    } else {
      console.log(`Homework ${row.id} ("${row.title}") is already fully normalized.`);
    }
  }

  console.log(`\nType normalization backfill process completed:`);
  console.log(`- Successfully updated: ${updatedCount}`);
}

run();
