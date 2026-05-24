import { supabase } from "../lib/supabase";
import { CalendarEvent } from "../../constants/schoolData";

// Resolve event category from title/name
function resolveCategory(name: string): "Achievement" | "Leadership" | "Excellence" | "Social" {
  const lower = name.toLowerCase();
  if (lower.includes("sports") || lower.includes("meet") || lower.includes("run") || lower.includes("achievement")) return "Achievement";
  if (lower.includes("debate") || lower.includes("leadership") || lower.includes("council") || lower.includes("elect")) return "Leadership";
  if (lower.includes("exam") || lower.includes("test") || lower.includes("exhib") || lower.includes("excellence")) return "Excellence";
  return "Social";
}

export async function getEvents(institutionId: string): Promise<CalendarEvent[]> {
  try {
    const { data, error } = await supabase
      .from("holidays")
      .select("id, name, date")
      .eq("institution_id", institutionId)
      .order("date", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(h => {
      // Format date like "Oct 24, 2026"
      const formattedDate = new Date(h.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return {
        id: h.id,
        title: h.name,
        date: formattedDate,
        time: "All Day",
        location: "School Campus",
        category: resolveCategory(h.name)
      };
    });
  } catch (error) {
    console.error("Error in getEvents:", error);
    return [];
  }
}

export async function createEvent(
  institutionId: string,
  title: string,
  dateStr: string, // format e.g. "Oct 24, 2026" or YYYY-MM-DD
  time: string,
  location: string,
  category: "Achievement" | "Leadership" | "Excellence" | "Social"
): Promise<CalendarEvent> {
  // 1. Resolve date format to YYYY-MM-DD
  let dbDate = dateStr;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      dbDate = d.toISOString().slice(0, 10);
    }
  } catch (e) {
    // ignore
  }

  // 2. Fetch current active academic year ID
  const { data: ayData, error: ayErr } = await supabase
    .from("academic_years")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("is_current", true)
    .maybeSingle();

  if (ayErr) throw ayErr;
  
  let academicYearId = ayData?.id;
  if (!academicYearId) {
    // Fallback: get any academic year
    const { data: anyAy } = await supabase
      .from("academic_years")
      .select("id")
      .eq("institution_id", institutionId)
      .limit(1)
      .maybeSingle();
    academicYearId = anyAy?.id;
  }

  if (!academicYearId) {
    throw new Error("No active academic year found for this institution.");
  }

  // 3. Insert into holidays table
  const { data, error } = await supabase
    .from("holidays")
    .insert({
      institution_id: institutionId,
      academic_year_id: academicYearId,
      date: dbDate,
      name: title
    })
    .select("id, name, date")
    .single();

  if (error) throw error;

  const formattedDate = new Date(data.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    id: data.id,
    title: data.name,
    date: formattedDate,
    time: time || "All Day",
    location: location || "School Campus",
    category: category
  };
}
