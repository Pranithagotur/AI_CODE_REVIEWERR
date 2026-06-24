interface RuleViolation {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  message: string;
  fix?: string;
}

export function runStaticRules(language: string, sourceCode: string): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const lines = sourceCode.split('\n');
  const normalizedLang = language.toLowerCase();

  // 1. Check Hardcoded Secrets (All languages)
  checkHardcodedSecrets(lines, violations);

  // 2. Check Duplicate Code Blocks (All languages)
  checkDuplicateCode(lines, violations);

  // Language Specific Analysis
  if (normalizedLang === 'javascript' || normalizedLang === 'js') {
    checkJavaScriptRules(lines, sourceCode, violations);
  } else if (normalizedLang === 'python' || normalizedLang === 'py') {
    checkPythonRules(lines, sourceCode, violations);
  } else if (normalizedLang === 'cpp' || normalizedLang === 'c++') {
    checkCppRules(lines, sourceCode, violations);
  } else if (normalizedLang === 'java') {
    checkJavaRules(lines, sourceCode, violations);
  }

  return violations;
}

// Check hardcoded values and credentials
function checkHardcodedSecrets(lines: string[], violations: RuleViolation[]) {
  const secretKeywords = ['api_key', 'apikey', 'secret', 'password', 'passwd', 'token', 'private_key'];
  // Match key = "value" or key: "value"
  const secretRegex = /['"`]?([a-zA-Z0-9_\-]*secret[a-zA-Z0-9_\-]*|api_key|password|token|private_key)['"`]?\s*[:=]\s*['"`]([a-zA-Z0-9_\-]{8,})['"`]/i;

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    // Skip comment lines
    if (isCommentLine(lineText)) return;

    const match = lineText.match(secretRegex);
    if (match) {
      const keyName = match[1];
      const val = match[2];
      // Exclude obviously placeholder values like "YOUR_API_KEY", "dummy_password"
      if (!/YOUR_|DUMMY|PLACEHOLDER|TEST|DEMO/i.test(val)) {
        violations.push({
          ruleId: 'hardcoded_secret',
          severity: 'error',
          line: lineNum,
          message: `Potential hardcoded credential or API key detected in variable/key '${keyName}'.`,
          fix: `const ${keyName} = process.env.${keyName.toUpperCase()}; // Load from environment variables`
        });
      }
    }
  });
}

// Check duplicate code blocks (3 or more identical non-empty lines)
function checkDuplicateCode(lines: string[], violations: RuleViolation[]) {
  const minLines = 3;
  const cleanedLines = lines.map(l => l.trim());

  for (let i = 0; i <= cleanedLines.length - minLines; i++) {
    // Skip empty lines, brace-only lines, or comments
    const chunk = cleanedLines.slice(i, i + minLines);
    if (chunk.some(l => l.length === 0 || l === '}' || l === '{' || l.startsWith('//') || l.startsWith('#'))) {
      continue;
    }

    const chunkStr = chunk.join('\n');

    // Search for duplicates later in the file
    for (let j = i + minLines; j <= cleanedLines.length - minLines; j++) {
      const compareChunk = cleanedLines.slice(j, j + minLines).join('\n');
      if (chunkStr === compareChunk) {
        violations.push({
          ruleId: 'duplicate_code',
          severity: 'warning',
          line: i + 1,
          message: `Duplicate code block detected. This 3-line block is repeated starting at line ${j + 1}.`,
          fix: '// Refactor duplicate statements into a reusable helper function or module'
        });
        // Only report once per chunk
        return;
      }
    }
  }
}

// --- JavaScript / TypeScript Rules ---
function checkJavaScriptRules(lines: string[], fullText: string, violations: RuleViolation[]) {
  // Let/Const/Var variable declarations
  const varDeclRegex = /\b(?:var|let|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const declaredVars = new Set<string>();
  const varLineMap = new Map<string, number>();

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    if (isCommentLine(lineText)) return;

    // A. Naming convention: camelCase check for variables
    let match;
    const localDeclRegex = /\b(?:var|let|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    while ((match = localDeclRegex.exec(lineText)) !== null) {
      const varName = match[1];
      declaredVars.add(varName);
      varLineMap.set(varName, lineNum);

      // Check if snake_case (e.g. variable_name) and not UPPERCASE (e.g. CONSTANT_VAL)
      if (varName.includes('_') && varName !== varName.toUpperCase()) {
        violations.push({
          ruleId: 'naming_convention',
          severity: 'info',
          line: lineNum,
          message: `JavaScript naming convention warning: Variable '${varName}' should be camelCase.`,
          fix: `const ${toCamelCase(varName)} = ...;`
        });
      }
    }

    // B. Infinite Loops
    if (/\bwhile\s*\(\s*true\s*\)/.test(lineText) || /\bwhile\s*\(\s*1\s*\)/.test(lineText)) {
      if (!hasLoopBreaker(lines, idx)) {
        violations.push({
          ruleId: 'infinite_loop',
          severity: 'error',
          line: lineNum,
          message: 'Potential infinite loop detected. The while condition is always true and no loop exit (break) was found in the block.',
        });
      }
    }

    // C. Exception Handling
    if (/\bJSON\.parse\b/.test(lineText) || /\breadFileSync\b/.test(lineText)) {
      if (!isInsideTryCatch(lines, idx)) {
        violations.push({
          ruleId: 'missing_exception_handling',
          severity: 'warning',
          line: lineNum,
          message: 'Risky parsing or synchronous file operation. Wrap this statement in a try-catch block to prevent runtime crashes.',
          fix: `try {\n  ${lineText.trim()}\n} catch (error) {\n  console.error("Operation failed", error);\n}`
        });
      }
    }
  });

  // D. Unused Variables
  declaredVars.forEach(varName => {
    // Regex checking usages of this variable (not matching declaration prefix like 'let varName')
    const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
    const matches = fullText.match(usageRegex);
    if (matches && matches.length === 1) {
      const lineNum = varLineMap.get(varName) || 1;
      violations.push({
        ruleId: 'unused_variable',
        severity: 'warning',
        line: lineNum,
        message: `Variable '${varName}' is declared but never read or used.`,
        fix: ''
      });
    }
  });
}

// --- Python Rules ---
function checkPythonRules(lines: string[], fullText: string, violations: RuleViolation[]) {
  // Variable assignments: var_name = ... (ignoring double equals ==)
  const varDeclRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=(?!=)\s*/g;
  const declaredVars = new Set<string>();
  const varLineMap = new Map<string, number>();

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    if (isCommentLine(lineText)) return;

    // A. Naming convention: snake_case for variables
    let match;
    const localDeclRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=(?!=)\s*/g;
    while ((match = localDeclRegex.exec(lineText)) !== null) {
      const varName = match[1];
      // Skip class definitions or common false positives
      if (varName === 'self' || varName.toUpperCase() === varName) continue;
      
      declaredVars.add(varName);
      varLineMap.set(varName, lineNum);

      // Check if camelCase (e.g. camelCaseVariable)
      if (/[A-Z]/.test(varName) && !/^[A-Z0-9_]+$/.test(varName)) {
        violations.push({
          ruleId: 'naming_convention',
          severity: 'info',
          line: lineNum,
          message: `Python naming convention warning: Variable '${varName}' should be snake_case.`,
          fix: `${toSnakeCase(varName)} = ...`
        });
      }
    }

    // B. Infinite Loops
    if (/\bwhile\s+True\b/.test(lineText) || /\bwhile\s+1\b/.test(lineText)) {
      if (!hasLoopBreaker(lines, idx, '#')) {
        violations.push({
          ruleId: 'infinite_loop',
          severity: 'error',
          line: lineNum,
          message: 'Potential infinite loop detected. The while condition is always True and no loop break statement was found.',
        });
      }
    }

    // C. Exception Handling
    if (/\bopen\s*\(/.test(lineText) || /\burllib\b/.test(lineText) || /\brequests\.[a-z]+\(/.test(lineText)) {
      if (!isInsideTryExcept(lines, idx)) {
        violations.push({
          ruleId: 'missing_exception_handling',
          severity: 'warning',
          line: lineNum,
          message: 'Risky I/O or network call. Enclose this in a try-except block to handle file errors or timeouts gracefully.',
          fix: `try:\n    ${lineText.trim()}\nexcept Exception as e:\n    print(f"Error occurred: {e}")`
        });
      }
    }
  });

  // D. Unused Variables
  declaredVars.forEach(varName => {
    const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
    const matches = fullText.match(usageRegex);
    if (matches && matches.length === 1) {
      const lineNum = varLineMap.get(varName) || 1;
      violations.push({
        ruleId: 'unused_variable',
        severity: 'warning',
        line: lineNum,
        message: `Variable '${varName}' is assigned a value but never read or referenced.`,
        fix: ''
      });
    }
  });
}

// --- C++ Rules ---
function checkCppRules(lines: string[], fullText: string, violations: RuleViolation[]) {
  let newAllocations = 0;
  let deleteAllocations = 0;

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    if (isCommentLine(lineText)) return;

    // A. Infinite Loops
    if (/\bwhile\s*\(\s*true\s*\)/.test(lineText) || /\bwhile\s*\(\s*1\s*\)/.test(lineText) || /\bfor\s*\(\s*;\s*;\s*\)/.test(lineText)) {
      if (!hasLoopBreaker(lines, idx)) {
        violations.push({
          ruleId: 'infinite_loop',
          severity: 'error',
          line: lineNum,
          message: 'Potential infinite loop detected in C++. No break statement found inside the loop block.',
        });
      }
    }

    // B. Tracking raw new and delete for memory leak analysis
    if (/\bnew\s+[a-zA-Z_]/.test(lineText) && !/\bdelete\b/.test(lineText)) {
      newAllocations++;
    }
    if (/\bdelete\s+/.test(lineText)) {
      deleteAllocations++;
    }

    // C. Exception handling for pointers or divisions
    if (/\bifstream\b/.test(lineText) || /\bofstream\b/.test(lineText)) {
      if (!isInsideTryCatch(lines, idx)) {
        violations.push({
          ruleId: 'missing_exception_handling',
          severity: 'info',
          line: lineNum,
          message: 'File stream opened outside a try-catch block. Consider using try-catch to manage file exceptions.',
        });
      }
    }
  });

  // D. Memory Leak Warning
  if (newAllocations > deleteAllocations) {
    violations.push({
      ruleId: 'memory_leak',
      severity: 'error',
      line: lines.findIndex(l => /\bnew\s+/.test(l)) + 1 || 1,
      message: `Memory Leak Risk: Detected ${newAllocations} raw 'new' operations, but only ${deleteAllocations} 'delete' statements in the source.`,
      fix: 'Use std::unique_ptr or std::shared_ptr from <memory> to automate memory reclamation (RAII).'
    });
  }
}

// --- Java Rules ---
function checkJavaRules(lines: string[], fullText: string, violations: RuleViolation[]) {
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    if (isCommentLine(lineText)) return;

    // A. Infinite Loops
    if (/\bwhile\s*\(\s*true\s*\)/.test(lineText) || /\bwhile\s*\(\s*1\s*\)/.test(lineText) || /\bfor\s*\(\s*;\s*;\s*\)/.test(lineText)) {
      if (!hasLoopBreaker(lines, idx)) {
        violations.push({
          ruleId: 'infinite_loop',
          severity: 'error',
          line: lineNum,
          message: 'Potential infinite loop detected. The statement creates a permanent loop without inline breakers.',
        });
      }
    }

    // B. Exception handling for parse and database actions
    if (/\bInteger\.parseInt\b/.test(lineText) || /\bDouble\.parseDouble\b/.test(lineText) || /\bDriverManager\.getConnection\b/.test(lineText)) {
      if (!isInsideTryCatch(lines, idx)) {
        violations.push({
          ruleId: 'missing_exception_handling',
          severity: 'warning',
          line: lineNum,
          message: 'Risky casting/parsing or network stream initialization. Enclose this inside a try-catch block.',
          fix: `try {\n    ${lineText.trim()}\n} catch (NumberFormatException e) {\n    // handle exception\n}`
        });
      }
    }
  });
}

// --- Helper Functions ---
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*');
}

function toCamelCase(str: string): string {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

// Check if a loop block starting at loopStartIdx contains a break/return
function hasLoopBreaker(lines: string[], loopStartIdx: number, commentChar = '//'): boolean {
  let openBraces = 0;
  let startedBlock = false;

  for (let i = loopStartIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith(commentChar)) continue;

    if (line.includes('{')) {
      openBraces += (line.match(/{/g) || []).length;
      startedBlock = true;
    }
    if (line.includes('}')) {
      openBraces -= (line.match(/}/g) || []).length;
    }

    if (/\bbreak\b/.test(line) || /\breturn\b/.test(line)) {
      return true;
    }

    // If braces match and block is done, exit
    if (startedBlock && openBraces <= 0) {
      break;
    }

    // For Python style, monitor indentation level
    if (commentChar === '#' && i > loopStartIdx) {
      const baseIndent = lines[loopStartIdx].search(/\S/);
      const currentIndent = lines[i].search(/\S/);
      if (currentIndent !== -1 && currentIndent <= baseIndent) {
        break; // Out of block indent
      }
      if (/\bbreak\b/.test(line) || /\breturn\b/.test(line)) {
        return true;
      }
    }
  }
  return false;
}

// Basic search upward to check if the current line is inside a try block
function isInsideTryCatch(lines: string[], currentIdx: number): boolean {
  let depth = 0;
  for (let i = currentIdx; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.includes('catch') || line.includes('catch(')) {
      // If we see catch first upwards, we might be inside a catch or outside
      depth++;
    }
    if (line.includes('try') && !line.includes('try-with-resources')) {
      if (depth === 0) return true;
      depth--;
    }
  }
  return false;
}

// basic search upward to check if current python line is inside a try block
function isInsideTryExcept(lines: string[], currentIdx: number): boolean {
  const currentIndent = lines[currentIdx].search(/\S/);
  for (let i = currentIdx - 1; i >= 0; i--) {
    const line = lines[i];
    const indent = line.search(/\S/);
    if (line.trim().startsWith('try:') && indent < currentIndent) {
      return true;
    }
    // If indentation matches or goes outer, but it is not try, stop search
    if (indent !== -1 && indent <= currentIndent && !line.trim().startsWith('try:')) {
      // Check if we hit try block at same indent later
      if (indent < currentIndent) break;
    }
  }
  return false;
}
