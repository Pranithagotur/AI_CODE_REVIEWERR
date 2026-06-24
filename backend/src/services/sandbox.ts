import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface SandboxResult {
  success: boolean;
  output: string;
  error?: string;
  line?: number;
  fix?: string;
  executionTimeMs: number;
}

const TEMP_DIR = path.resolve(__dirname, '../../temp_sandbox');

// Ensure the sandbox temp directory exists inside workspace
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Check if Docker is installed and running
let dockerAvailable: boolean | null = null;
function checkDocker(): boolean {
  if (dockerAvailable !== null) return dockerAvailable;
  try {
    execSync('docker info', { stdio: 'ignore' });
    console.log('Docker daemon detected. Sandbox will run inside isolated Docker containers.');
    dockerAvailable = true;
  } catch {
    console.log('Docker daemon not detected. Sandbox will fall back to local sub-process execution with security filters.');
    dockerAvailable = false;
  }
  return dockerAvailable;
}

export async function executeCode(language: string, sourceCode: string): Promise<SandboxResult> {
  const isDocker = checkDocker();
  const startTime = Date.now();
  const fileId = uuidv4();
  const normalizedLang = language.toLowerCase();

  // A. Local Security Filter (Always check for safety)
  const safetyCheck = verifyCodeSafety(normalizedLang, sourceCode);
  if (!safetyCheck.safe) {
    return {
      success: false,
      output: '',
      error: `Security Violation: ${safetyCheck.reason}`,
      line: safetyCheck.line,
      fix: 'Remove OS, system, or administrative shell calls to run within the sandbox.',
      executionTimeMs: 0
    };
  }

  // B. Write temporary source files
  const filePaths = createTempFiles(normalizedLang, fileId, sourceCode);
  if (!filePaths) {
    return {
      success: false,
      output: '',
      error: 'Backend Error: Failed to generate temporary files for sandbox.',
      executionTimeMs: 0
    };
  }

  try {
    let result: SandboxResult;
    if (isDocker) {
      result = await runInDocker(normalizedLang, filePaths, startTime);
    } else {
      result = await runLocalProcess(normalizedLang, filePaths, startTime);
    }
    return result;
  } catch (err: any) {
    return {
      success: false,
      output: '',
      error: err.message || 'Unknown sandbox error.',
      executionTimeMs: Date.now() - startTime
    };
  } finally {
    // Cleanup temporary files
    cleanupTempFiles(filePaths);
  }
}

// C. Security Filter for local execution
function verifyCodeSafety(lang: string, code: string): { safe: boolean; reason?: string; line?: number } {
  const lines = code.split('\n');
  
  // JavaScript dangerous patterns
  const jsBans = [
    /\bchild_process\b/, /\brequire\s*\(\s*['"]fs['"]\)/, /\brequire\s*\(\s*['"]os['"]\)/,
    /\bprocess\.(?:exit|kill|env|mainModule|stderr|stdin|stdout)\b/, /\bcluster\b/,
    /\bhttp\b/, /\bnet\b/, /\bdgram\b/, /\beval\s*\(/, /\bFunction\s*\(/
  ];

  // Python dangerous patterns
  const pyBans = [
    /\bimport\s+os\b/, /\bimport\s+sys\b/, /\bimport\s+subprocess\b/,
    /\bfrom\s+os\b/, /\bfrom\s+sys\b/, /\bfrom\s+subprocess\b/,
    /\beval\s*\(/, /\bexec\s*\(/, /\bopen\s*\(/, /\bsocket\b/, /\bshutil\b/, /\burllib\b/, /\brequests\b/
  ];

  // C++ dangerous patterns
  const cppBans = [
    /\bsystem\s*\(/, /\bpopen\s*\(/, /\bfork\s*\(/, /\bexec\b/, /\bstd::filesystem\b/
  ];

  // Java dangerous patterns
  const javaBans = [
    /\bRuntime\.getRuntime\b/, /\bProcessBuilder\b/, /\bjava\.io\./, /\bjava\.net\./
  ];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNum = idx + 1;

    if (lang === 'javascript' || lang === 'js') {
      if (jsBans.some(regex => regex.test(line))) {
        return { safe: false, reason: 'Restricted system-level or network call detected.', line: lineNum };
      }
    } else if (lang === 'python' || lang === 'py') {
      if (pyBans.some(regex => regex.test(line))) {
        return { safe: false, reason: 'Restricted module import or file handling operation detected.', line: lineNum };
      }
    } else if (lang === 'cpp' || lang === 'c++') {
      if (cppBans.some(regex => regex.test(line))) {
        return { safe: false, reason: 'Restricted OS system invocation detected.', line: lineNum };
      }
    } else if (lang === 'java') {
      if (javaBans.some(regex => regex.test(line))) {
        return { safe: false, reason: 'Restricted Reflection or File/Network Stream API usage.', line: lineNum };
      }
    }
  }

  return { safe: true };
}

interface TempFilePaths {
  dir: string;
  sourceFile: string;
  sourceBaseName: string;
  executableFile?: string;
  javaClassName?: string;
}

function createTempFiles(lang: string, id: string, code: string): TempFilePaths | null {
  const runDir = path.join(TEMP_DIR, id);
  fs.mkdirSync(runDir);

  if (lang === 'javascript' || lang === 'js') {
    const file = path.join(runDir, 'index.js');
    fs.writeFileSync(file, code);
    return { dir: runDir, sourceFile: file, sourceBaseName: 'index.js' };
  } 
  
  if (lang === 'python' || lang === 'py') {
    const file = path.join(runDir, 'main.py');
    fs.writeFileSync(file, code);
    return { dir: runDir, sourceFile: file, sourceBaseName: 'main.py' };
  }

  if (lang === 'cpp' || lang === 'c++') {
    const file = path.join(runDir, 'main.cpp');
    const outFile = path.join(runDir, 'main.exe');
    fs.writeFileSync(file, code);
    return { dir: runDir, sourceFile: file, sourceBaseName: 'main.cpp', executableFile: outFile };
  }

  if (lang === 'java') {
    // Detect public class name in Java file
    const match = code.match(/\bpublic\s+class\s+([a-zA-Z0-9_]+)\b/);
    const className = match ? match[1] : 'Main';
    const file = path.join(runDir, `${className}.java`);
    fs.writeFileSync(file, code);
    return { dir: runDir, sourceFile: file, sourceBaseName: `${className}.java`, javaClassName: className };
  }

  return null;
}

function cleanupTempFiles(paths: TempFilePaths) {
  try {
    if (fs.existsSync(paths.dir)) {
      // delete files recursively
      fs.rmSync(paths.dir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Sandbox cleanup warning:', err);
  }
}

// D. Docker execution block
function runInDocker(lang: string, paths: TempFilePaths, startTime: number): Promise<SandboxResult> {
  return new Promise((resolve) => {
    let dockerCmd = '';
    const volPath = paths.dir.replace(/\\/g, '/'); // Normalize paths for Docker daemon

    // Command configuration with timeouts (timeout 2s), limits (128mb RAM, 0.5 CPU, no network)
    const limitParams = '--rm -i --memory=128m --cpus=0.5 --network=none';

    if (lang === 'javascript' || lang === 'js') {
      dockerCmd = `docker run ${limitParams} -v "${volPath}:/app" -w /app node:18-slim node index.js`;
    } else if (lang === 'python' || lang === 'py') {
      dockerCmd = `docker run ${limitParams} -v "${volPath}:/app" -w /app python:3.10-slim python main.py`;
    } else if (lang === 'cpp' || lang === 'c++') {
      // Compile first, then execute
      const compileCmd = `docker run --rm -v "${volPath}:/app" -w /app gcc:latest g++ main.cpp -o main.out`;
      exec(compileCmd, { timeout: 5000 }, (cErr, cStdout, cStderr) => {
        if (cErr || cStderr) {
          const parsed = parseCompilerError('cpp', cStderr || cStdout || cErr!.message);
          resolve({
            success: false,
            output: '',
            error: `Compilation Error:\n${cStderr || cStdout}`,
            line: parsed.line,
            fix: parsed.fix,
            executionTimeMs: Date.now() - startTime
          });
          return;
        }
        
        const runCmd = `docker run ${limitParams} -v "${volPath}:/app" -w /app gcc:latest ./main.out`;
        executeRunCommand(runCmd, lang, startTime, resolve);
      });
      return;
    } else if (lang === 'java') {
      const compileCmd = `docker run --rm -v "${volPath}:/app" -w /app openjdk:17-slim javac ${paths.javaClassName}.java`;
      exec(compileCmd, { timeout: 6000 }, (cErr, cStdout, cStderr) => {
        if (cErr || cStderr) {
          const parsed = parseCompilerError('java', cStderr || cStdout || cErr!.message);
          resolve({
            success: false,
            output: '',
            error: `Compilation Error:\n${cStderr || cStdout}`,
            line: parsed.line,
            fix: parsed.fix,
            executionTimeMs: Date.now() - startTime
          });
          return;
        }

        const runCmd = `docker run ${limitParams} -v "${volPath}:/app" -w /app openjdk:17-slim java ${paths.javaClassName}`;
        executeRunCommand(runCmd, lang, startTime, resolve);
      });
      return;
    }

    executeRunCommand(dockerCmd, lang, startTime, resolve);
  });
}

// E. Local execution block (fallback)
function runLocalProcess(lang: string, paths: TempFilePaths, startTime: number): Promise<SandboxResult> {
  return new Promise((resolve) => {
    let compileCmd = '';
    let runCmd = '';

    if (lang === 'javascript' || lang === 'js') {
      runCmd = `node "${paths.sourceFile}"`;
    } else if (lang === 'python' || lang === 'py') {
      runCmd = `python "${paths.sourceFile}"`;
    } else if (lang === 'cpp' || lang === 'c++') {
      compileCmd = `g++ "${paths.sourceFile}" -o "${paths.executableFile}"`;
      runCmd = `"${paths.executableFile}"`;
    } else if (lang === 'java') {
      compileCmd = `javac "${paths.sourceFile}"`;
      // Run Java classes by changing directory and targeting class
      runCmd = `java -cp "${paths.dir}" ${paths.javaClassName}`;
    }

    if (compileCmd) {
      exec(compileCmd, { timeout: 5000 }, (cErr, cStdout, cStderr) => {
        if (cErr) {
          const compileOutput = cStderr || cStdout || cErr.message;
          const parsed = parseCompilerError(lang, compileOutput);
          resolve({
            success: false,
            output: '',
            error: `Compilation Error:\n${compileOutput}`,
            line: parsed.line,
            fix: parsed.fix,
            executionTimeMs: Date.now() - startTime
          });
          return;
        }
        
        executeRunCommand(runCmd, lang, startTime, resolve);
      });
    } else {
      executeRunCommand(runCmd, lang, startTime, resolve);
    }
  });
}

// F. Generic command execution with timeout handlers
function executeRunCommand(cmd: string, lang: string, startTime: number, resolve: (res: SandboxResult) => void) {
  exec(cmd, { timeout: 2000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    const elapsed = Date.now() - startTime;

    if (err) {
      if (err.killed) {
        resolve({
          success: false,
          output: stdout,
          error: 'Execution Timeout: Code took too long to run. Check for infinite loops or extremely heavy calculations.',
          line: 1,
          fix: 'Ensure loop termination conditions are reachable, base cases in recursion are defined, or reduce work sizing.',
          executionTimeMs: elapsed
        });
        return;
      }

      const rawError = stderr || err.message;
      const parsed = parseRuntimeException(lang, rawError);
      resolve({
        success: false,
        output: stdout,
        error: `Runtime Exception:\n${rawError}`,
        line: parsed.line,
        fix: parsed.fix,
        executionTimeMs: elapsed
      });
      return;
    }

    resolve({
      success: true,
      output: stdout,
      executionTimeMs: elapsed
    });
  });
}

// G. Parsing tracebacks to map lines & issue detailed corrections
function parseCompilerError(lang: string, output: string): { line?: number; fix?: string } {
  let line: number | undefined;
  let fix: string | undefined;

  if (lang === 'cpp' || lang === 'c++') {
    // Match main.cpp:12:5: error: ...
    const match = output.match(/main\.cpp:(\d+):(\d+):\s*error:\s*(.+)/i);
    if (match) {
      line = parseInt(match[1]);
      const message = match[3];
      fix = generateCompilerFix('cpp', message);
    }
  } else if (lang === 'java') {
    // Match Main.java:4: error: ...
    const match = output.match(/[a-zA-Z0-9_]+\.java:(\d+):\s*error:\s*(.+)/i);
    if (match) {
      line = parseInt(match[1]);
      const message = match[2];
      fix = generateCompilerFix('java', message);
    }
  }

  return { line, fix };
}

function parseRuntimeException(lang: string, output: string): { line?: number; fix?: string } {
  let line: number | undefined;
  let fix: string | undefined;

  if (lang === 'python' || lang === 'py') {
    // Match line number in Traceback: File "main.py", line 4, in <module>
    const lineMatch = output.match(/File\s+["']main\.py["'],\s+line\s+(\d+)/i);
    const typeMatch = output.match(/([a-zA-Z0-9_]+Error):\s*(.+)/i);
    
    if (lineMatch) line = parseInt(lineMatch[1]);
    if (typeMatch) {
      const errType = typeMatch[1];
      const errMsg = typeMatch[2];
      fix = generateRuntimeFix('python', errType, errMsg);
    }
  } else if (lang === 'javascript' || lang === 'js') {
    // Match node traceback format:
    // /app/index.js:5
    //   throw new Error("...");
    const lineMatch = output.match(/index\.js:(\d+)/i);
    const typeMatch = output.match(/([a-zA-Z0-9_]+Error):\s*(.+)/i);

    if (lineMatch) line = parseInt(lineMatch[1]);
    if (typeMatch) {
      const errType = typeMatch[1];
      const errMsg = typeMatch[2];
      fix = generateRuntimeFix('javascript', errType, errMsg);
    }
  } else if (lang === 'java') {
    // Match Java exception format: Exception in thread "main" java.lang.NullPointerException
    // at Main.main(Main.java:5)
    const lineMatch = output.match(/at\s+[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\([a-zA-Z0-9_]+\.java:(\d+)\)/i);
    const typeMatch = output.match(/Exception\s+in\s+thread\s+["'][a-zA-Z0-9_]+["']\s+([a-zA-Z0-9_.]+)(?::\s*(.+))?/i);

    if (lineMatch) line = parseInt(lineMatch[1]);
    if (typeMatch) {
      const errClass = typeMatch[1].split('.').pop() || '';
      const errMsg = typeMatch[2] || '';
      fix = generateRuntimeFix('java', errClass, errMsg);
    }
  } else if (lang === 'cpp' || lang === 'c++') {
    // C++ doesn't output stack traces by default on segmentation faults
    if (output.includes('Segmentation fault') || output.includes('SIGSEGV')) {
      fix = 'Segfault indicates memory access violation. Check for uninitialized pointers, null pointer dereferencing, or array indexes exceeding boundaries.';
      line = 1;
    }
  }

  return { line, fix };
}

function generateCompilerFix(lang: string, message: string): string {
  const msg = message.toLowerCase();
  if (lang === 'cpp') {
    if (msg.includes('was not declared in this scope')) {
      return 'Variable is used before declaration or has a typo in its name. Ensure it is defined and spelling is correct.';
    }
    if (msg.includes('expected \';\'')) {
      return 'Syntax Error: Missing semicolon at the end of the line.';
    }
    if (msg.includes('no matching function for call')) {
      return 'Function Signature mismatch. Ensure parameter types and count match function definition.';
    }
  } else if (lang === 'java') {
    if (msg.includes('cannot find symbol')) {
      return 'Symbol not found. Verify class imports, variable scopes, and check for spelling errors.';
    }
    if (msg.includes('\';\' expected')) {
      return 'Syntax Error: Missing semicolon at the end of the line.';
    }
    if (msg.includes('incompatible types')) {
      return 'Type Mismatch. The assigned type does not match variable type. Cast value explicitly or adjust variable type.';
    }
  }
  return 'Review syntax compiler guidelines and fix reported error tokens.';
}

function generateRuntimeFix(lang: string, errType: string, errMsg: string): string {
  const type = errType.toLowerCase();
  const msg = errMsg.toLowerCase();

  // Python
  if (lang === 'python') {
    if (type.includes('zerodivisionerror')) {
      return 'Check inputs or denominators before dividing. Add `if denominator != 0:` guard checks.';
    }
    if (type.includes('indexerror')) {
      return 'Array/List index out of bounds. Verify indices are strictly less than `len(list)`.';
    }
    if (type.includes('keyerror')) {
      return 'Dictionary key does not exist. Use `dict.get(key, default)` or verify keys before retrieval.';
    }
    if (type.includes('nameerror')) {
      return 'Attempting to reference a variable or function that has not been defined yet.';
    }
    if (type.includes('typeerror')) {
      return 'Invalid type operation. Convert variable explicitly (e.g. str(num) or int(string)) to align parameter types.';
    }
  }

  // JS
  if (lang === 'javascript') {
    if (type.includes('typeerror')) {
      if (msg.includes('cannot read properties') || msg.includes('undefined') || msg.includes('null')) {
        return 'Null/Undefined reference. Add Optional Chaining `object?.property` or verify the object is initialized.';
      }
      return 'Unsupported function call or property access on variable. Check variable type declarations.';
    }
    if (type.includes('referenceerror')) {
      return 'Reference to undefined variable. Ensure the variable name is spelled correctly and is declared in the local scope.';
    }
    if (type.includes('rangeerror')) {
      return 'Stack overflow or index bounds violated. Check recursive functions for exit conditions or review loops.';
    }
  }

  // Java
  if (lang === 'java') {
    if (type.includes('nullpointerexception')) {
      return 'Null pointer exception. Initialize the object or add a null check before calling its members: `if (obj != null) { ... }`';
    }
    if (type.includes('arrayindexoutofboundsexception')) {
      return 'Array index out of bounds. Check index boundaries to make sure index < array.length.';
    }
    if (type.includes('arithmeticexception')) {
      return 'Arithmetic error. Add a check to prevent division by zero: `if (divisor != 0) { ... }`';
    }
    if (type.includes('numberformatexception')) {
      return 'Format error parsing string to number. Enclose block inside `try-catch` for `NumberFormatException`.';
    }
  }

  return `Handle exception '${errType}': ${errMsg}`;
}
