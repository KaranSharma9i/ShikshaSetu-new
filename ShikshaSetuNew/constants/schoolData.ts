export interface SchoolConfig {
  name: string;
  tagline: string;
  logo: any; // local asset path
  address: string;
  theme: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
  };
}

export interface Metric {
  id: string;
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  icon: string;
}

export interface ClassPerformance {
  id: string;
  name: string;
  avgMarks: string;
  avgAiScore: string;
  growth: string;
  isPositive: boolean;
}

export interface SubjectAnalytics {
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

export interface FeeDefaulter {
  id: string;
  name: string;
  className: string;
  pendingAmount: string;
  dueDate: string;
  status: "Overdue" | "Pending";
}

export interface Circular {
  id: string;
  title: string;
  date: string;
  category: "Announcement" | "Urgent" | "Event" | "Holiday";
  body: string;
  audience: "All" | "Students" | "Teachers" | "Parents";
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: "Achievement" | "Leadership" | "Excellence" | "Social";
}

export interface TeacherPerformance {
  id: string;
  name: string;
  subject: string;
  classes: string[];
  rating: string;
  feedbackRate: string;
}

export const schoolData = {
  config: {
    name: "Gurukul Shikshalaya",
    tagline: "Nurturing Minds, Shaping Futures",
    logo: require("../assets/gurukul.png"),
    address: "42 Heritage Oaks Way, North Campus District, State 4022",
    theme: {
      primary: "#0F1C2C",
      secondary: "#735c00",
      background: "#FDF9F1", // Warm Cream Background
      surface: "#FFFFFF",
    }
  } as SchoolConfig,

  metrics: [
    { id: "1", title: "Total Students", value: 1250, change: "+24 this month", isPositive: true, icon: "people-outline" },
    { id: "2", title: "Total Teachers", value: 48, change: "+2 this term", isPositive: true, icon: "school-outline" },
    { id: "3", title: "Fee Collection Rate", value: "85.2%", change: "+4% vs last month", isPositive: true, icon: "cash-outline" },
    { id: "4", title: "Student Attendance", value: "94.2%", change: "+1.2% vs average", isPositive: true, icon: "calendar-outline" },
  ] as Metric[],

  growthMetrics: [
    { id: "1", month: "Jan", attendance: 92, fees: 65 },
    { id: "2", month: "Feb", attendance: 93, fees: 70 },
    { id: "3", month: "Mar", attendance: 94, fees: 75 },
    { id: "4", month: "Apr", attendance: 94.2, fees: 85.2 },
  ],

  classes: [
    { id: "1", name: "Grade 10-B", avgMarks: "92.4%", avgAiScore: "4.8/5.0", growth: "+5.2%", isPositive: true },
    { id: "2", name: "Grade 09-A", avgMarks: "88.1%", avgAiScore: "4.2/5.0", growth: "+2.1%", isPositive: true },
    { id: "3", name: "Grade 08-C", avgMarks: "85.6%", avgAiScore: "3.9/5.0", growth: "-1.4%", isPositive: false },
    { id: "4", name: "Grade 11-A", avgMarks: "90.2%", avgAiScore: "4.5/5.0", growth: "+3.8%", isPositive: true },
    { id: "5", name: "Grade 12-A", avgMarks: "94.0%", avgAiScore: "4.9/5.0", growth: "+1.5%", isPositive: true },
  ] as ClassPerformance[],

  subjects: [
    { id: "1", subject: "Mathematics", topic: "Advanced Calculus & Statistics", avgMarks: 84, avgScore: 3.8, difficulty: "High", topPerformer: "R. Malhotra", needsSupportCount: 12, improvementPercent: "+8% vs Last Term", icon: "calculator-outline" },
    { id: "2", subject: "Physics", topic: "Mechanics & Optics", avgMarks: 76, avgScore: 3.5, difficulty: "Medium", topPerformer: "A. Sterling", needsSupportCount: 8, improvementPercent: "+12% vs Last Term", icon: "flask-outline" },
    { id: "3", subject: "English", topic: "Literature & Composition", avgMarks: 92, avgScore: 4.2, difficulty: "Low", topPerformer: "S. Sen", needsSupportCount: 2, improvementPercent: "+3% vs Last Term", icon: "book-outline" },
    { id: "4", subject: "Chemistry", topic: "Organic & Inorganic", avgMarks: 68, avgScore: 2.9, difficulty: "High", topPerformer: "M. Verma", needsSupportCount: 18, improvementPercent: "-2% vs Last Term", icon: "color-filter-outline" },
  ] as SubjectAnalytics[],

  defaulters: [
    { id: "1", name: "Rahul Deshmukh", className: "Grade 10-B", pendingAmount: "₹4,500", dueDate: "30th May, 2026", status: "Pending" },
    { id: "2", name: "Aria Sharma", className: "Grade 9-A", pendingAmount: "₹12,000", dueDate: "15th May, 2026", status: "Overdue" },
    { id: "3", name: "Devansh Patel", className: "Grade 8-C", pendingAmount: "₹8,500", dueDate: "20th May, 2026", status: "Overdue" },
  ] as FeeDefaulter[],

  circulars: [
    { id: "1", title: "Annual Day preparations starting next week", date: "May 20, 2026", category: "Event", body: "We are starting preparations for the 25th Annual Day. Interested students can register for events with their class teachers.", audience: "All" },
    { id: "2", title: "Summer holidays schedule updated", date: "May 18, 2026", category: "Announcement", body: "Please note that summer holidays will commence on June 1st and end on July 10th. The campus will remain closed except for administrative work.", audience: "All" },
    { id: "3", title: "Staff attendance checklist generated for today", date: "May 23, 2026", category: "Urgent", body: "All staff members must verify their biometric entry by 9:00 AM.", audience: "Teachers" },
  ] as Circular[],

  events: [
    { id: "1", title: "Annual Sports Meet", date: "Oct 24, 2026", time: "08:00 AM", location: "Main Athletic Arena", category: "Achievement" },
    { id: "2", title: "Inter-School Debate", date: "Nov 05, 2026", time: "10:30 AM", location: "Socrates Auditorium", category: "Leadership" },
    { id: "3", title: "Parent-Teacher Meeting", date: "Dec 12, 2026", time: "09:00 AM", location: "Block A - Conference Wing", category: "Excellence" },
  ] as CalendarEvent[],

  teachers: [
    { id: "1", name: "Dr. Ananya Rao", subject: "Mathematics & Physics", classes: ["Grade 10-A", "Grade 10-B", "Grade 9-A"], rating: "98%", feedbackRate: "99.2%" },
    { id: "2", name: "Mr. Rajesh Kumar", subject: "Science", classes: ["Grade 9-B", "Grade 8-A"], rating: "94%", feedbackRate: "95.6%" },
    { id: "3", name: "Mrs. Sarah Jones", subject: "English", classes: ["Grade 10-A", "Grade 12-A"], rating: "96%", feedbackRate: "97.8%" },
    { id: "4", name: "Mr. Amit Sharma", subject: "History", classes: ["Grade 9-A", "Grade 8-C"], rating: "92%", feedbackRate: "91.0%" },
  ] as TeacherPerformance[]
};
