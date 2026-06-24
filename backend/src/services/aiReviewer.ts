import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { runStaticRules } from './ruleEngine';
import { query } from '../db';

dotenv.config();

interface AiReviewResponse {
  bug_reports: Array<{
    line: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestion: string;
  }>;
  code_quality: {
    rating: string; // e.g. A, B, C, F
    summary: string;
    maintainability: string;
  };
  refactoring_suggestions: Array<{
    original: string;
    replacement: string;
    explanation: string;
  }>;
  complexity_analysis: {
    time_complexity: string;
    space_complexity: string;
    explanation: string;
  };
  learning_resources?: Array<{
    title: string;
    url: string;
    tip: string;
  }>;
}

export async function getAiCodeReview(
  language: string,
  sourceCode: string,
  mode: 'student' | 'developer' = 'developer'
): Promise<AiReviewResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      console.log(`Requesting LLM code review from Gemini API in ${mode} mode...`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const prompt = buildReviewPrompt(language, sourceCode, mode);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Clean up markdown markers if any (Gemini sometimes puts JSON in markdown tags)
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      }

      const parsed: AiReviewResponse = JSON.parse(cleanJson);
      return parsed;
    } catch (err: any) {
      console.error('LLM API Call failed. Error:', err.message);
      console.log('Using local offline analysis fallback for AI review.');
    }
  } else {
    console.log('GEMINI_API_KEY environment variable is missing. Running offline AI simulation...');
  }

  // Fallback local AI review simulation using static engine results & database patterns
  return await simulateOfflineAiReview(language, sourceCode, mode);
}

function buildReviewPrompt(language: string, code: string, mode: 'student' | 'developer'): string {
  const isStudent = mode === 'student';

  return `
You are an expert AI code reviewer. Review the following code snippet.
Language: ${language}
Target Audience Mode: ${mode.toUpperCase()} ${isStudent ? '(Beginner-friendly explanations, focuses on teaching fundamentals, lists learning resources, avoids advanced jargon)' : '(Advanced performance optimization, security checks like OWASP, complexity metrics)'}

Source Code:
\`\`\`${language}
${code}
\`\`\`

Analyze the code and output a JSON object containing the review findings. The JSON MUST strictly match the following schema:
{
  "bug_reports": [
    {
      "line": 1, // 1-indexed line number of the bug
      "message": "Brief error explanation",
      "severity": "error" | "warning" | "info",
      "suggestion": "How to fix it"
    }
  ],
  "code_quality": {
    "rating": "A" | "B" | "C" | "D" | "F",
    "summary": "Overall code summary review statement.",
    "maintainability": "Excellent" | "Good" | "Average" | "Poor"
  },
  "refactoring_suggestions": [
    {
      "original": "exact original code line/block",
      "replacement": "exact drop-in replacement code line/block",
      "explanation": "Why this replacement is cleaner, faster, or safer."
    }
  ],
  "complexity_analysis": {
    "time_complexity": "e.g., O(N) or O(N^2)",
    "space_complexity": "e.g., O(1) or O(N)",
    "explanation": "Brief explanation of the Big-O metrics."
  }${isStudent ? `,
  "learning_resources": [
    {
      "title": "Topic Title (e.g. Exception Handling in Python)",
      "url": "Provide a educational website link (e.g., geeksforgeeks, mdn, w3schools, python.org docs)",
      "tip": "Beginner friendly tip to remember this topic"
    }
  ]` : ''}
}

Guidelines for JSON formatting:
1. Ensure the JSON is valid and fits exactly the schema.
2. Return ONLY the JSON object. Do not wrap inside comments or text.
3. ${isStudent ? 'Write beginner explanations. Avoid complex terms. Explain standard library functions.' : 'Analyze memory efficiency, thread safety, database index efficiency, and security weaknesses.'}
`;
}

// Local offline rule & Knowledge Base mapping analyzer to simulate LLM responses
async function simulateOfflineAiReview(
  language: string,
  code: string,
  mode: 'student' | 'developer'
): Promise<AiReviewResponse> {
  const staticViolations = runStaticRules(language, code);
  const isStudent = mode === 'student';

  // Extract bug reports from rule violations
  const bug_reports = staticViolations.map(v => ({
    line: v.line,
    message: v.message,
    severity: v.severity,
    suggestion: v.fix || 'Review language guide and apply best practices.'
  }));

  // Fetch relevant Knowledge Base articles for the language to improve suggestions
  let articles: any[] = [];
  try {
    articles = await query(
      'SELECT title, category, pattern, solution FROM knowledge_base WHERE language = ? OR language = ?',
      [language.toLowerCase(), 'all']
    );
  } catch (dbErr) {
    console.error('KB Query failed inside Offline Review:', dbErr);
  }

  const refactoring_suggestions: Array<{ original: string; replacement: string; explanation: string }> = [];
  const learning_resources: Array<{ title: string; url: string; tip: string }> = [];

  // Match code contents against database patterns to build suggestions
  articles.forEach(art => {
    // Basic search of pattern keyword in source code
    const keywords = art.pattern.split(/\s+/).filter((k: string) => k.length > 3);
    const matchesKeyword = keywords.length > 0 && keywords.every((kw: string) => code.toLowerCase().includes(kw.toLowerCase()));

    if (matchesKeyword) {
      refactoring_suggestions.push({
        original: '// Pattern matched: ' + art.pattern,
        replacement: '// Solution recommended',
        explanation: `${art.title}: ${art.solution}`
      });

      if (isStudent) {
        learning_resources.push({
          title: art.title,
          url: `https://www.google.com/search?q=${encodeURIComponent(art.title + ' in ' + language)}`,
          tip: `Remember: ${art.solution.substring(0, 100)}...`
        });
      }
    }
  });

  // Calculate simulated Code Quality rating
  let rating = 'A';
  let maintainability = 'Excellent';
  const errors = bug_reports.filter(b => b.severity === 'error').length;
  const warnings = bug_reports.filter(b => b.severity === 'warning').length;

  if (errors > 0) {
    rating = errors >= 2 ? 'F' : 'C';
    maintainability = 'Poor';
  } else if (warnings > 0) {
    rating = warnings >= 3 ? 'C' : 'B';
    maintainability = 'Average';
  }

  // Set default complexity
  let time_complexity = 'O(1)';
  let space_complexity = 'O(1)';
  let complexity_explanation = 'Static code review indicates simple linear execution paths without nested operations.';

  // Heuristic complexity checks
  if (code.includes('for ') || code.includes('while ')) {
    time_complexity = 'O(N)';
    complexity_explanation = 'The code contains a loop iterating over input structures, suggesting linear time complexity.';
    
    // Check nested loops
    const loopMatches = (code.match(/\bfor\b|\bwhile\b/g) || []).length;
    if (loopMatches >= 2 && code.replace(/\s+/g, '').includes('for') && code.replace(/\s+/g, '').includes('loop')) {
      time_complexity = 'O(N^2)';
      complexity_explanation = 'Nested loops detected. This can lead to exponential time requirements on larger data loads.';
    }
  }

  const response: AiReviewResponse = {
    bug_reports,
    code_quality: {
      rating,
      summary: `[OFFLINE ANALYSIS] Reviewed ${language} code. Detected ${errors} critical errors and ${warnings} warnings. ${
        isStudent 
          ? 'Focus on cleaning up syntax structures and learning compiler exceptions.' 
          : 'Refactor code to optimize loop structures and close resource leaks.'
      }`,
      maintainability
    },
    refactoring_suggestions,
    complexity_analysis: {
      time_complexity,
      space_complexity,
      explanation: complexity_explanation
    }
  };

  if (isStudent) {
    // Add default learning resources if none found
    if (learning_resources.length === 0) {
      learning_resources.push({
        title: `Learn ${language} Programming Basics`,
        url: language.toLowerCase() === 'python' ? 'https://docs.python.org/3/tutorial/' : 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
        tip: 'Review foundational logic, loops, variables, and code comments.'
      });
    }
    response.learning_resources = learning_resources;
  }

  return response;
}
