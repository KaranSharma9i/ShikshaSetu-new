import { supabase } from "../lib/supabase";
import { Circular } from "../../constants/schoolData";

// Helper to determine Category from title/content
function resolveCategory(title: string, content: string): "Announcement" | "Urgent" | "Event" | "Holiday" {
  const lower = (title + " " + content).toLowerCase();
  if (lower.includes("urgent") || lower.includes("attention") || lower.includes("must")) return "Urgent";
  if (lower.includes("holiday") || lower.includes("vacation") || lower.includes("closed")) return "Holiday";
  if (lower.includes("event") || lower.includes("meet") || lower.includes("sports") || lower.includes("debate")) return "Event";
  return "Announcement";
}

// Helper to determine Audience from title/content
function resolveAudience(title: string, content: string): "All" | "Students" | "Teachers" | "Parents" {
  const lower = (title + " " + content).toLowerCase();
  if (lower.includes("teacher") || lower.includes("staff") || lower.includes("faculty")) return "Teachers";
  if (lower.includes("student") || lower.includes("pupil")) return "Students";
  if (lower.includes("parent") || lower.includes("guardian")) return "Parents";
  return "All";
}

export async function getCirculars(institutionId: string): Promise<Circular[]> {
  try {
    const { data, error } = await supabase
      .from("circulars")
      .select("id, title, content, publish_date")
      .eq("institution_id", institutionId)
      .order("publish_date", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(c => {
      const formattedDate = new Date(c.publish_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return {
        id: c.id,
        title: c.title,
        body: c.content,
        date: formattedDate,
        category: resolveCategory(c.title, c.content),
        audience: resolveAudience(c.title, c.content)
      };
    });
  } catch (error) {
    console.error("Error in getCirculars:", error);
    return [];
  }
}

export async function createCircular(
  institutionId: string,
  title: string,
  content: string,
  createdBy: string | null
): Promise<Circular> {
  const publishDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data, error } = await supabase
    .from("circulars")
    .insert({
      institution_id: institutionId,
      title,
      content,
      publish_date: publishDate,
      created_by: createdBy
    })
    .select("id, title, content, publish_date")
    .single();

  if (error) throw error;

  const formattedDate = new Date(data.publish_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    id: data.id,
    title: data.title,
    body: data.content,
    date: formattedDate,
    category: resolveCategory(data.title, data.content),
    audience: resolveAudience(data.title, data.content)
  };
}
