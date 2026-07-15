export const documentQuizPrompt = (text) => `
Based on the following document content, generate five multiple choice questions with answers:

${text}

Format each question as:
**Question:** [question text]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
**Answer:** [correct letter]
`;