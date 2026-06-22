import "../config";
import { supabase } from "../config";
import { geminiService } from "../services/gemini";

async function run() {
  // Check if we are running for a specific homework_id (e.g. from CLI args)
  const targetHwId = process.argv[2];

  console.log("Starting answer key backfill process...");
  if (targetHwId) {
    console.log(`Targeting specific homework ID: ${targetHwId}`);
  }

  // 1. Query homework rows
  const query = supabase
    .from("homework")
    .select("id, title, description, generated_content, subjects(name), classes(name)");
  
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
  let failedCount = 0;

  for (const row of rows) {
    if (!row.generated_content) {
      console.log(`Skipping homework ${row.id}: No generated_content.`);
      continue;
    }

    let content: any;
    try {
      content = typeof row.generated_content === "string"
        ? JSON.parse(row.generated_content)
        : row.generated_content;
    } catch (err) {
      console.error(`Skipping homework ${row.id}: Failed to parse JSON generated_content.`);
      continue;
    }

    if (!content || !Array.isArray(content.questions)) {
      console.log(`Skipping homework ${row.id}: Empty or invalid questions array.`);
      continue;
    }

    // Check if there are any missing answer keys
    let isMissingAnswerKey = false;
    for (const q of content.questions) {
      if (q.type !== "CASE_STUDY" && q.type !== "Case Study") {
        if (!q.answer_key) {
          isMissingAnswerKey = true;
          break;
        }
      } else if (q.sub_questions && Array.isArray(q.sub_questions)) {
        for (const sub of q.sub_questions) {
          if (!sub.answer_key) {
            isMissingAnswerKey = true;
            break;
          }
        }
      }
      if (isMissingAnswerKey) break;
    }

    if (!isMissingAnswerKey) {
      console.log(`Skipping homework ${row.id} ("${row.title}"): All answer keys already present.`);
      continue;
    }

    console.log(`\n--------------------------------------------`);
    console.log(`Processing homework ID: ${row.id}`);
    console.log(`Title: ${row.title}`);
    console.log(`Description: ${row.description}`);

    const subjectName = (row.subjects as any)?.name || "General";
    const className = (row.classes as any)?.name || "Unknown Grade";
    const topic = row.description || row.title || "General";

    try {
      // 2. Call Gemini to reconstruct keys
      const updatedQuestions = await geminiService.reconstructAnswerKeys(
        content.questions,
        subjectName,
        className,
        row.title,
        topic
      );

      // Replace questions in content
      content.questions = updatedQuestions;

      // 3. Write back to database
      const { error: updateError } = await supabase
        .from("homework")
        .update({ generated_content: content })
        .eq("id", row.id);

      if (updateError) {
        console.error(`Failed to update homework ${row.id} in DB:`, updateError);
        failedCount++;
      } else {
        console.log(`Successfully backfilled answer keys for homework ${row.id}!`);
        updatedCount++;
      }
    } catch (err: any) {
      console.error(`Failed to backfill answer keys for homework ${row.id} after retries:`, err.message || err);
      failedCount++;
    }
  }

  console.log(`\n============================================`);
  console.log(`Backfill process completed:`);
  console.log(`- Successfully updated: ${updatedCount}`);
  console.log(`- Failed/Errors: ${failedCount}`);
  console.log(`============================================`);
}

run();
