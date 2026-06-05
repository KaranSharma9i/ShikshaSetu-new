// Scratch script to test prompt construction logic
const mockParams = {
  subject: "Mathematics",
  grade: "Class 8",
  title: "Algebra - Quadratic Equations",
  topicDescription: "Solve standard quadratic equations and word problems .",
  planTier: "PRO" as const,
  questions: [
    {
      question_number: 1,
      type: "MCQ",
      question: "What is the degree of a quadratic equation?",
      options: ["A. 1", "B. 2", "C. 3", "D. 4"]
    },
    {
      question_number: 2,
      type: "SHORT",
      question: "Solve for x: x^2 - 5x + 6 = 0",
      options: null
    }
  ]
};

function buildTestPrompt(params: typeof mockParams): string {
  let prompt = `You are the AI homework evaluator for Margam ERP. Evaluate the student's homework submission from the image provided.
  
Homework Details:
- Subject: ${params.subject}
- Grade/Class: ${params.grade}
- Assignment Title: ${params.title}
- Topic Description: ${params.topicDescription}
`;

  if (params.questions && params.questions.length > 0) {
    prompt += `\nHere are the exact questions that the student had to answer:\n`;
    params.questions.forEach((q: any) => {
      prompt += `Question ${q.question_number} (${q.type}): ${q.question}\n`;
      if (q.options && q.options.length > 0) {
        prompt += `Options:\n` + q.options.map((opt: string) => `  - ${opt}`).join('\n') + `\n`;
      }
    });
  }

  prompt += `
Analyze the handwritten or typed text inside the image. Check for accuracy, completeness, understanding of concepts, and presentation.`;
  return prompt;
}

console.log("=== BUILT PROMPT ===");
console.log(buildTestPrompt(mockParams));
console.log("====================");
