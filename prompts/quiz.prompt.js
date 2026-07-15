export const quizPrompt = (topic) => `
Generate five multiple choice questions with answers on:

${topic}

Format each question as:
**Question:** [question text]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
**Answer:** [correct letter]
`;