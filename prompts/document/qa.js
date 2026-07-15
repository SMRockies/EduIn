export const documentQAPrompt = (text, question) => `
Based on the following document content:

${text}

Answer this question in detail:
${question}
`;