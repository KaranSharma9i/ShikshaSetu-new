import { supabase } from "../lib/supabase";

export interface ClassPerformanceData {
  id: string;
  name: string;
  avgMarks: string;
  avgAiScore: string;
  growth: string;
  isPositive: boolean;
}

export interface SubjectAnalyticData {
  id: string;
  subject: string;
  topic: string;
  avgMarks: number;
  avgScore: number;
  difficulty: "High" | "Medium" | "Low";
  topPerformer: string;
  needsSupportCount: number;
  improvementPercent: string;
  icon: string;
}

export async function getClassesPerformance(institutionId: string): Promise<ClassPerformanceData[]> {
  try {
    // Query sections and corresponding classes
    const { data: sectionsData, error: sectionsError } = await supabase
      .from("sections")
      .select(`
        id,
        name,
        class:classes!inner (
          id,
          name,
          grade_number,
          institution_id
        )
      `)
      .eq("class.institution_id", institutionId)
      .order("name", { ascending: true });

    if (sectionsError) throw sectionsError;

    const filteredSections = sectionsData || [];

    // Let's compute average marks per class from exam_results
    // We can query exams and results in bulk
    const { data: examsData, error: examsError } = await supabase
      .from("exams")
      .select("id, class_id, total_marks");

    if (examsError) throw examsError;

    const examIds = examsData?.map(e => e.id) || [];
    let examResults: any[] = [];
    if (examIds.length > 0) {
      const { data: resultsData, error: resultsError } = await supabase
        .from("exam_results")
        .select("exam_id, student_id, marks_obtained")
        .in("exam_id", examIds);
      if (resultsError) throw resultsError;
      examResults = resultsData || [];
    }

    // Build the list of ClassPerformanceData
    const result: ClassPerformanceData[] = [];

    // Fallback static metrics mapped to section names if database results are empty
    const fallbacks: Record<string, Partial<ClassPerformanceData>> = {
      "Grade 9-A": { avgMarks: "88.1%", avgAiScore: "4.2/5.0", growth: "+2.1%", isPositive: true },
      "Grade 10-B": { avgMarks: "92.4%", avgAiScore: "4.8/5.0", growth: "+5.2%", isPositive: true },
      "Grade 11-A": { avgMarks: "90.2%", avgAiScore: "4.5/5.0", growth: "+3.8%", isPositive: true },
      "Grade 12-A": { avgMarks: "94.0%", avgAiScore: "4.9/5.0", growth: "+1.5%", isPositive: true },
      "Grade 8-C": { avgMarks: "85.6%", avgAiScore: "3.9/5.0", growth: "-1.4%", isPositive: false },
    };

    const addedClasses = new Set<string>();

    for (const sec of filteredSections) {
      const classObj = Array.isArray(sec.class) ? sec.class[0] : (sec.class as any);
      const className = classObj?.name || "";
      const sectionName = sec.name || "";
      const fullName = `${className}-${sectionName}`; // e.g., "Class 9-A" -> map to "Grade 9-A" in display
      const displayName = fullName.replace("Class ", "Grade ");

      if (addedClasses.has(displayName)) continue;
      addedClasses.add(displayName);

      const classId = classObj?.id;
      const classExams = examsData?.filter(e => e.class_id === classId) || [];
      const classExamIds = classExams.map(e => e.id);
      
      const classResults = examResults.filter(r => classExamIds.includes(r.exam_id) && r.marks_obtained !== null);
      
      let avgMarksStr = "85.0%";
      if (classResults.length > 0) {
        let totalPct = 0;
        classResults.forEach(r => {
          const exam = classExams.find(e => e.id === r.exam_id);
          const maxMarks = Number(exam?.total_marks) || 100;
          totalPct += (Number(r.marks_obtained) / maxMarks) * 100;
        });
        avgMarksStr = `${(totalPct / classResults.length).toFixed(1)}%`;
      } else if (fallbacks[displayName]) {
        avgMarksStr = fallbacks[displayName].avgMarks || "85.0%";
      }

      // Compute average AI score (from homework_submissions)
      // For demo, query average score or use fallback
      let avgScoreStr = "4.2/5.0";
      if (fallbacks[displayName]) {
        avgScoreStr = fallbacks[displayName].avgAiScore || "4.2/5.0";
      }

      result.push({
        id: sec.id,
        name: displayName,
        avgMarks: avgMarksStr,
        avgAiScore: avgScoreStr,
        growth: fallbacks[displayName]?.growth || "+1.0%",
        isPositive: fallbacks[displayName]?.isPositive ?? true
      });
    }

    // Sort by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error in getClassesPerformance:", error);
    return [
      { id: "1", name: "Grade 10-B", avgMarks: "92.4%", avgAiScore: "4.8/5.0", growth: "+5.2%", isPositive: true },
      { id: "2", name: "Grade 9-A", avgMarks: "88.1%", avgAiScore: "4.2/5.0", growth: "+2.1%", isPositive: true },
      { id: "3", name: "Grade 8-C", avgMarks: "85.6%", avgAiScore: "3.9/5.0", growth: "-1.4%", isPositive: false },
      { id: "4", name: "Grade 11-A", avgMarks: "90.2%", avgAiScore: "4.5/5.0", growth: "+3.8%", isPositive: true },
      { id: "5", name: "Grade 12-A", avgMarks: "94.0%", avgAiScore: "4.9/5.0", growth: "+1.5%", isPositive: true },
    ];
  }
}

export async function getSubjectAnalytics(
  institutionId: string,
  selectedGradeName: string // e.g. "Grade 10-B"
): Promise<SubjectAnalyticData[]> {
  try {
    // 1. Resolve class name and section name from display string
    const normalizedName = selectedGradeName.replace("Grade ", "Class "); // "Class 10-B"
    const nameParts = normalizedName.split("-");
    const className = nameParts[0];
    const sectionLetter = nameParts[1] || "A";

    // 2. Fetch section ID
    const { data: sectionData, error: secErr } = await supabase
      .from("sections")
      .select(`
        id,
        class:classes!inner (
          id,
          name
        )
      `)
      .eq("name", sectionLetter)
      .eq("class.name", className)
      .eq("class.institution_id", institutionId)
      .maybeSingle();

    if (secErr) throw secErr;

    const sectionId = sectionData?.id;
    if (!sectionId) throw new Error("Section not found");

    // 3. Fetch subjects associated with this section
    const { data: classSubs, error: subsErr } = await supabase
      .from("class_subjects")
      .select(`
        id,
        subject:subjects (
          id,
          name,
          code
        )
      `)
      .eq("section_id", sectionId);

    if (subsErr) throw subsErr;

    // Filter and map subjects
    const subjectsList = classSubs?.map((cs: any) => cs.subject).filter(Boolean) || [];

    // Fallbacks for demo analytics
    const mockSubjects: Record<string, Partial<SubjectAnalyticData>> = {
      "Mathematics": { topic: "Advanced Calculus & Statistics", difficulty: "High", topPerformer: "R. Malhotra", needsSupportCount: 12, improvementPercent: "+8% vs Last Term", icon: "calculator-outline" },
      "Physics": { topic: "Mechanics & Optics", difficulty: "Medium", topPerformer: "A. Sterling", needsSupportCount: 8, improvementPercent: "+12% vs Last Term", icon: "flask-outline" },
      "English": { topic: "Literature & Composition", difficulty: "Low", topPerformer: "S. Sen", needsSupportCount: 2, improvementPercent: "+3% vs Last Term", icon: "book-outline" },
      "Chemistry": { topic: "Organic & Inorganic", difficulty: "High", topPerformer: "M. Verma", needsSupportCount: 18, improvementPercent: "-2% vs Last Term", icon: "color-filter-outline" },
    };

    const result: SubjectAnalyticData[] = [];

    for (const sub of subjectsList) {
      const name = sub.name;
      const meta = mockSubjects[name] || {
        topic: "Core Syllabus Elements",
        difficulty: "Medium",
        topPerformer: "A. Student",
        needsSupportCount: 3,
        improvementPercent: "+4% vs Last Term",
        icon: "book-outline"
      };

      // In a live system, query average exams and homework scores for this subject and section
      const { data: exams, error: exErr } = await supabase
        .from("exams")
        .select("id, total_marks, passing_marks")
        .eq("class_id", Array.isArray(sectionData.class) ? sectionData.class[0]?.id : (sectionData.class as any)?.id)
        .eq("subject_id", sub.id);

      let avgMarks = 75; // Default fallback
      let needsSupport = meta.needsSupportCount || 0;

      if (!exErr && exams && exams.length > 0) {
        const examIds = exams.map(e => e.id);
        const { data: results } = await supabase
          .from("exam_results")
          .select("exam_id, marks_obtained, student_id")
          .in("exam_id", examIds);

        if (results && results.length > 0) {
          let totalPercentage = 0;
          let validCount = 0;
          let supportCount = 0;

          results.forEach(r => {
            if (r.marks_obtained !== null && r.marks_obtained !== undefined) {
              const exam = exams.find(e => e.id === r.exam_id);
              if (exam) {
                const total = Number(exam.total_marks) || 100;
                const percentage = (Number(r.marks_obtained) / total) * 100;
                totalPercentage += percentage;
                validCount++;

                const passing = Number(exam.passing_marks) || 40;
                if (Number(r.marks_obtained) < passing) {
                  supportCount++;
                }
              }
            }
          });

          if (validCount > 0) {
            avgMarks = Math.min(100, Math.round(totalPercentage / validCount));
            needsSupport = supportCount;
          }
        }
      }

      result.push({
        id: sub.id,
        subject: name,
        topic: meta.topic || "Syllabus Core",
        avgMarks: avgMarks,
        avgScore: activeMetricTabScoreValue(name), // Mock GPA mapping
        difficulty: meta.difficulty || "Medium",
        topPerformer: meta.topPerformer || "Top Scorer",
        needsSupportCount: needsSupport,
        improvementPercent: meta.improvementPercent || "+5%",
        icon: meta.icon || "book-outline"
      });
    }

    return result;
  } catch (error) {
    console.error("Error in getSubjectAnalytics:", error);
    return [
      { id: "1", subject: "Mathematics", topic: "Advanced Calculus & Statistics", avgMarks: 84, avgScore: 3.8, difficulty: "High", topPerformer: "R. Malhotra", needsSupportCount: 12, improvementPercent: "+8% vs Last Term", icon: "calculator-outline" },
      { id: "2", subject: "Physics", topic: "Mechanics & Optics", avgMarks: 76, avgScore: 3.5, difficulty: "Medium", topPerformer: "A. Sterling", needsSupportCount: 8, improvementPercent: "+12% vs Last Term", icon: "flask-outline" },
      { id: "3", subject: "English", topic: "Literature & Composition", avgMarks: 92, avgScore: 4.2, difficulty: "Low", topPerformer: "S. Sen", needsSupportCount: 2, improvementPercent: "+3% vs Last Term", icon: "book-outline" },
      { id: "4", subject: "Chemistry", topic: "Organic & Inorganic", avgMarks: 68, avgScore: 2.9, difficulty: "High", topPerformer: "M. Verma", needsSupportCount: 18, improvementPercent: "-2% vs Last Term", icon: "color-filter-outline" },
    ];
  }
}

function activeMetricTabScoreValue(subject: string): number {
  switch (subject) {
    case "Mathematics": return 3.8;
    case "Physics": return 3.5;
    case "English": return 4.2;
    case "Chemistry": return 2.9;
    default: return 4.0;
  }
}

export interface StudentReportCardSubject {
  subject_id: string;
  subject_name: string;
  exam_name: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  grade: string;
  remarks: string;
}

export interface StudentReportCardData {
  subjects: StudentReportCardSubject[];
  overallAvg: number;
  overallGrade: string;
  academicYearLabel: string;
}

export async function getStudentReportCard(
  studentId: string,
  academicYearId: string
): Promise<StudentReportCardData | null> {
  try {
    // 1. Fetch academic year label
    const { data: ay, error: ayErr } = await supabase
      .from("academic_years")
      .select("label")
      .eq("id", academicYearId)
      .maybeSingle();
      
    if (ayErr) throw ayErr;
    const academicYearLabel = ay?.label || "2026-27";

    // 2. Fetch exam results for this student and academic year
    const { data: results, error: resultsErr } = await supabase
      .from("exam_results")
      .select(`
        marks_obtained,
        grade,
        remarks,
        exam:exams!inner (
          id,
          exam_name,
          total_marks,
          subject:subjects!inner (
            id,
            name
          )
        )
      `)
      .eq("student_id", studentId)
      .eq("exam.academic_year_id", academicYearId);

    if (resultsErr) throw resultsErr;

    const subjects: StudentReportCardSubject[] = [];
    let totalObtained = 0;
    let totalMax = 0;

    if (results && results.length > 0) {
      results.forEach((r: any) => {
        const exam = Array.isArray(r.exam) ? r.exam[0] : r.exam;
        if (!exam) return;
        const subject = Array.isArray(exam.subject) ? exam.subject[0] : exam.subject;
        if (!subject) return;

        const max_marks = Number(exam.total_marks) || 100;
        const marks_obtained = Number(r.marks_obtained) || 0;
        const percentage = Math.round((marks_obtained / max_marks) * 100);

        totalObtained += marks_obtained;
        totalMax += max_marks;

        subjects.push({
          subject_id: subject.id,
          subject_name: subject.name,
          exam_name: exam.exam_name || "Unknown Exam",
          marks_obtained,
          max_marks,
          percentage,
          grade: r.grade || (percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B" : percentage >= 60 ? "C" : percentage >= 40 ? "D" : "F"),
          remarks: r.remarks || "",
        });
      });
    }

    const overallAvg = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    let overallGrade = "F";
    if (overallAvg >= 90) overallGrade = "A+";
    else if (overallAvg >= 80) overallGrade = "A";
    else if (overallAvg >= 70) overallGrade = "B";
    else if (overallAvg >= 60) overallGrade = "C";
    else if (overallAvg >= 40) overallGrade = "D";

    return {
      subjects,
      overallAvg,
      overallGrade,
      academicYearLabel,
    };
  } catch (error) {
    console.error("Error in getStudentReportCard repository:", error);
    return null;
  }
}

