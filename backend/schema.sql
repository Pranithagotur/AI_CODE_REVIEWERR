-- Database schema for AI-Based Code Review System

CREATE DATABASE IF NOT EXISTS code_review_db;
USE code_review_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Code Reviews Table
CREATE TABLE IF NOT EXISTS code_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  language VARCHAR(50) NOT NULL,
  source_code LONGTEXT NOT NULL,
  mode VARCHAR(50) NOT NULL DEFAULT 'developer', -- 'student' or 'developer'
  ai_feedback LONGTEXT, -- Stores JSON string
  rule_feedback LONGTEXT, -- Stores JSON string
  runtime_feedback LONGTEXT, -- Stores JSON string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Knowledge Base Table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'bug_pattern', 'best_practice', 'security', 'optimization'
  language VARCHAR(50) NOT NULL, -- 'python', 'javascript', 'cpp', 'java', 'all'
  pattern LONGTEXT NOT NULL, -- regex or description of pattern
  solution LONGTEXT NOT NULL -- explanation and fix suggestion
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Knowledge Base Data
INSERT INTO knowledge_base (title, category, language, pattern, solution) VALUES
-- JavaScript Common Bugs
('Unintentional Global Variables', 'bug_pattern', 'javascript', 'Implicit declaration of variables without let, const, or var', 'Always declare variables using `const` (for constants) or `let` (for re-assignable variables) to prevent polluting the global scope and causing hard-to-debug side effects.'),
('Floating Point Math Imprecision', 'bug_pattern', 'javascript', 'Direct comparisons of floating point calculations (e.g., 0.1 + 0.2 === 0.3)', 'Due to binary representation issues, floating-point math in JS is imprecise. Compare differences to `Number.EPSILON`: `Math.abs((0.1 + 0.2) - 0.3) < Number.EPSILON`.'),
('SQL Injection Vulnerability', 'security', 'javascript', 'Direct string concatenation in query templates (e.g., query(\"SELECT * FROM users WHERE id = \" + id))', 'Avoid direct string concatenation in database operations. Always use parameterized queries or prepared statements: `db.query(\"SELECT * FROM users WHERE id = ?\", [id])`.'),
('Hardcoded API Keys', 'security', 'javascript', 'Presence of secrets like API keys or passwords directly inside the code strings', 'Store credentials, API tokens, and environment configurations in secure configuration files (`.env`) and read them via `process.env.API_KEY` rather than committing them in plain text.'),

-- Python Common Bugs
('Mutable Default Arguments', 'bug_pattern', 'python', 'Defining functions with mutable structures like lists/dicts as default arguments (e.g., def func(a=[]))', 'In Python, default arguments are evaluated once when the function is defined. If you modify a mutable list, it accumulates values across calls. Change to `def func(a=None):` and initialize inside: `if a is None: a = []`.'),
('File Handling Without context manager', 'best_practice', 'python', 'Opening files with open() and not calling file.close() inside a finally block', 'Use the `with` context manager block `with open(filepath) as f:` to ensure file handlers are automatically released and closed even if an exception occurs during reading/writing.'),
('Inefficient String Concatenation in Loops', 'optimization', 'python', 'Iteratively using + to combine strings inside loops', 'Strings are immutable in Python. Using `+` in a loop creates a new string object each time. Use `.join()` on a list of components: `\"\".join(list_of_strings)` which is far faster for larger iterations.'),

-- C++ Common Bugs
('Memory Leak through Raw Pointers', 'bug_pattern', 'cpp', 'Using new/malloc without calling corresponding delete/free', 'Always ensure heap-allocated objects are released. Use smart pointers like `std::unique_ptr` or `std::shared_ptr` from `<memory>` to handle cleanups automatically (RAII pattern) and avoid dangling references.'),
('Buffer Overflow in String Handling', 'security', 'cpp', 'Using strcpy, strcat, or raw arrays for user input without bounds checks', 'Avoid deprecated C functions. Use `std::string` which resizes dynamically, and utilize safer routines like `strncpy` or specify bounds when handling standard string streams.'),
('Array Index Out of Bounds', 'bug_pattern', 'cpp', 'Iterating beyond the capacity of an array (e.g. index >= array_size)', 'Ensure loop conditions strictly compare indices to sizes: `for (int i = 0; i < size; ++i)`. Access elements via bound-checked containers like `std::vector::at()` instead of `operator[]` to raise exceptions on safety violations.'),

-- Java Common Bugs
('NullPointerException Risk', 'bug_pattern', 'java', 'Accessing methods on objects without prior null validation', 'Check objects for null before accessing fields, or utilize Java 8 `Optional<T>` to explicitly model optional properties and avoid unexpected application crashes.'),
('Inefficient Memory Usage with String Concatenation', 'optimization', 'java', 'Repeatedly combining strings with + inside high-iteration loops', 'In Java, string concatenation inside loops creates unnecessary `String` and `StringBuilder` allocations. Use `StringBuilder.append()` explicitly inside loops for high performance.'),
('Resource Leak due to Unclosed Streams', 'bug_pattern', 'java', 'Opening InputStreams / OutputStreams and not closing them in a finally block', 'Use Java`s try-with-resources syntax: `try (BufferedReader br = new BufferedReader(...)) { ... }` which automatically executes closures and releases file handles when the block is exited.');
