import { supabase } from "../lib/supabase";

export interface ClassPerformanceData {
  id: string;
  name: string;
  avgMarks: string;
  avgAiScore: string;
  growth: string;
  isPositive: boolean;
  grade_number?: number;
}

export interface SubjectAnalyticData {
  id: string;
  subject: string;
  topic: string;
  avgMarks: number;
  avgScore: number | null;
  difficulty: "High" | "Medium" | "Low";
  topPerformer: string;
  needsSupportCount: number;
  improvementPercent: string;
  icon: string;
}

export async function getClassesPerformance(institutionId: string): Promise<ClassPerformanceData[]> {
  try {
    // 1. Fetch active academic year
    const { data: ayData } = await supabase
      .from("academic_years")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
      .is("deleted_at", null)
      .maybeSingle();

    const currentAyId = ayData?.id;

    // 2. Query sections and corresponding classes for the current academic year
    let sectionsQuery = supabase
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

    if (currentAyId) {
      sectionsQuery = sectionsQuery.eq("academic_year_id", currentAyId);
    }

    const { data: sectionsData, error: sectionsError } = await sectionsQuery;

    if (sectionsError) throw sectionsError;

    const filteredSections = sectionsData || [];

    // Let's compute average marks per class from exam_results
    // We can query exams and results in bulk for the current academic year
    let examsQuery = supabase
      .from("exams")
      .select("id, class_id, total_marks");

    if (currentAyId) {
      examsQuery = examsQuery.eq("academic_year_id", currentAyId);
    }

    const { data: examsData, error: examsError } = await examsQuery;

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

    // Fetch all homework and their submissions in bulk for AI score computation for current academic year
    let hwQuery = supabase
      .from("homework")
      .select("id, section_id")
      .eq("institution_id", institutionId);

    if (currentAyId) {
      hwQuery = hwQuery.eq("academic_year_id", currentAyId);
    }

    const { data: homeworksData, error: hwError } = await hwQuery;

    const secAiScoreMap: Record<string, number[]> = {};
    if (!hwError && homeworksData && homeworksData.length > 0) {
      const hwIds = homeworksData.map(h => h.id);
      const { data: submissionsData, error: subError } = await supabase
        .from("homework_submissions")
        .select("homework_id, ai_score")
        .in("homework_id", hwIds);
      
      if (!subError && submissionsData && submissionsData.length > 0) {
        submissionsData.forEach(s => {
          const score = Number(s.ai_score);
          if (s.ai_score !== null && s.ai_score !== undefined && !isNaN(score)) {
            const hw = homeworksData.find(h => h.id === s.homework_id);
            if (hw && hw.section_id) {
              if (!secAiScoreMap[hw.section_id]) {
                secAiScoreMap[hw.section_id] = [];
              }
              secAiScoreMap[hw.section_id].push(score);
            }
          }
        });
      }
    }

    // Build the list of ClassPerformanceData
    const result: ClassPerformanceData[] = [];

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
      
      let avgMarksStr = "N/A";
      if (classResults.length > 0) {
        let totalPct = 0;
        classResults.forEach(r => {
          const exam = classExams.find(e => e.id === r.exam_id);
          const maxMarks = Number(exam?.total_marks) || 100;
          totalPct += (Number(r.marks_obtained) / maxMarks) * 100;
        });
        avgMarksStr = `${(totalPct / classResults.length).toFixed(1)}%`;
      }

      // Compute average AI score (from homework_submissions)
      let avgScoreStr = "N/A";
      const secScores = secAiScoreMap[sec.id];
      if (secScores && secScores.length > 0) {
        const sum = secScores.reduce((a, b) => a + b, 0);
        avgScoreStr = `${(sum / secScores.length).toFixed(1)}/10.0`;
      }

      result.push({
        id: sec.id,
        name: displayName,
        avgMarks: avgMarksStr,
        avgAiScore: avgScoreStr,
        growth: "0.0%",
        isPositive: true,
        grade_number: classObj?.grade_number
      });
    }

    // Sort by grade_number, then by name (section)
    return result.sort((a, b) => {
      const gA = a.grade_number ?? 99;
      const gB = b.grade_number ?? 99;
      if (gA !== gB) {
        return gA - gB;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error in getClassesPerformance:", error);
    return [];
  }
}

export async function getSubjectAnalytics(
  institutionId: string,
  selectedGradeName: string // e.g. "Grade 10-B"
): Promise<SubjectAnalyticData[]> {
  try {
    let normalizedName = selectedGradeName;
    const nameParts = normalizedName.split("-");
    let className = nameParts[0].trim();
    if (/^Grade\s+/i.test(className)) {
      className = className.replace(/^Grade\s+/i, "Class ");
    }
    const sectionLetter = (nameParts[1] || "A").trim();

    // 1. Fetch active academic year
    const { data: ayData } = await supabase
      .from("academic_years")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
      .is("deleted_at", null)
      .maybeSingle();

    const currentAyId = ayData?.id;

    // 2. Fetch section ID
    let secQuery = supabase
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
      .eq("class.institution_id", institutionId);

    if (currentAyId) {
      secQuery = secQuery.eq("academic_year_id", currentAyId);
    }

    const { data: sectionData, error: secErr } = await secQuery;

    if (secErr) throw secErr;

    const sectionsList = sectionData || [];
    const selectedSection = sectionsList[0];
    const sectionId = selectedSection?.id;
    if (!sectionId) {
      console.log(`Section not found for className: "${className}" and sectionLetter: "${sectionLetter}"`);
      return [];
    }

    const classObj = Array.isArray(selectedSection.class) ? selectedSection.class[0] : (selectedSection.class as any);
    const classId = classObj?.id;

    // 3. Fetch subjects associated with this section
    let subsQuery = supabase
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

    if (currentAyId) {
      subsQuery = subsQuery.eq("academic_year_id", currentAyId);
    }

    const { data: classSubs, error: subsErr } = await subsQuery;

    if (subsErr) throw subsErr;

    // Filter and map subjects
    const subjectsList = classSubs?.map((cs: any) => cs.subject).filter(Boolean) || [];

    // Fetch all homework and their submissions in bulk for AI score computation for this section
    let hwQuery = supabase
      .from("homework")
      .select("id, subject_id")
      .eq("section_id", sectionId);

    if (currentAyId) {
      hwQuery = hwQuery.eq("academic_year_id", currentAyId);
    }

    const { data: sectionHomeworks, error: hwErr } = await hwQuery;

    const submissionMap: Record<string, number[]> = {};
    if (!hwErr && sectionHomeworks && sectionHomeworks.length > 0) {
      const hwIds = sectionHomeworks.map(h => h.id);
      const { data: submissions, error: subErr } = await supabase
        .from("homework_submissions")
        .select("homework_id, ai_score")
        .in("homework_id", hwIds);

      if (!subErr && submissions && submissions.length > 0) {
        submissions.forEach(s => {
          const score = Number(s.ai_score);
          if (s.ai_score !== null && s.ai_score !== undefined && !isNaN(score)) {
            const hw = sectionHomeworks.find(h => h.id === s.homework_id);
            if (hw && hw.subject_id) {
              if (!submissionMap[hw.subject_id]) {
                submissionMap[hw.subject_id] = [];
              }
              submissionMap[hw.subject_id].push(score);
            }
          }
        });
      }
    }

    const result: SubjectAnalyticData[] = [];

    for (const sub of subjectsList) {
      const name = sub.name;

      // In a live system, query average exams and homework scores for this subject and section
      let examsQuery = supabase
        .from("exams")
        .select("id, total_marks, passing_marks")
        .eq("class_id", classId)
        .eq("subject_id", sub.id);

      if (currentAyId) {
        examsQuery = examsQuery.eq("academic_year_id", currentAyId);
      }

      const { data: exams, error: exErr } = await examsQuery;

      let avgMarks = 0;
      let needsSupport = 0;

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

      let avgScore: number | null = null;
      const scores = submissionMap[sub.id];
      if (scores && scores.length > 0) {
        const sum = scores.reduce((a, b) => a + b, 0);
        avgScore = Number((sum / scores.length).toFixed(1));
      }

      result.push({
        id: sub.id,
        subject: name,
        topic: "Core Syllabus Elements",
        avgMarks: avgMarks,
        avgScore: avgScore,
        difficulty: "Medium",
        topPerformer: "N/A",
        needsSupportCount: needsSupport,
        improvementPercent: "0%",
        icon: "book-outline"
      });
    }

    return result;
  } catch (error) {
    console.error("Error in getSubjectAnalytics:", error);
    return [];
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

