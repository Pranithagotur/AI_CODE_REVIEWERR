# Testing Documentation: AI-Based Code Review System

This document outlines the testing strategy, automated test commands, and manual test scripts to verify the functionality, security, and performance of the **ReviewLLM** system.

---

## 1. Automated Unit Tests

We have implemented two script-based unit tests inside the backend project:

### 1.1 Static Rule Engine Test
Validates that rules are parsed correctly and detect errors in JS, Python, and C++.
* **Command:**
  ```bash
  cd backend
  npm run test:rules
  ```
* **Expectations:** The console logs will list parsed JSON rule violations including `unused_variable`, `naming_convention`, `missing_exception_handling`, `memory_leak`, and `hardcoded_secret`.

### 1.2 Execution Sandbox Test
Validates local process execution, exception parsing, timeouts, and safe execution blocks.
* **Command:**
  ```bash
  cd backend
  npm run test:sandbox
  ```
* **Expectations:**
  - Test 1 (JS) returns a success code with `Hello Sandbox!`.
  - Test 2 (Python Zero Division) returns `success: false` and maps the error to line 4, recommending a division-by-zero check.
  - Test 3 (Python Loop) terminates after exactly 2 seconds and reports a timeout error, recommending loop termination checks.

---

## 2. Manual Test Cases (Dashboard Integration)

Follow these steps to manually test the React dashboard and Node.js APIs.

### TC1: Authentication and Account Creation
1. Open the dashboard.
2. Click **Sign In / Register** in the bottom sidebar.
3. Click **Don't have an account? Sign up**.
4. Enter Name, Email, and Password. Submit.
5. Log in using the newly created account.
6. **Expectation:** The user's name initials appear in the sidebar footer and the **Review History** and **Analytics** tabs unlock.

### TC2: Static Rules Validation (JavaScript)
1. In the workspace, choose **JavaScript**.
2. Click **Initiate Code Review**.
3. Go to the **Rule Engine** tab.
4. **Expectation:**
   - Warns about a snake_case variable name (`my_secret_key` and `mySecretKey`).
   - Warns about an unused variable (`unused_variable`).
   - Warns about `JSON.parse` missing exception handling.

### TC3: Memory Leak Detection (C++)
1. In the workspace, choose **C++**.
2. Click **Initiate Code Review**.
3. Go to the **Rule Engine** tab.
4. **Expectation:** An error violation of type `memory_leak` is reported at the allocation line, indicating that `new` operations lack corresponding `delete` calls.

### TC4: Runtime Exception Handling (Python)
1. Choose **Python**.
2. Click **Initiate Code Review**.
3. Go to the **Sandbox Console** tab.
4. **Expectation:**
   - The status bar indicates **Execution Failed** in red.
   - The stdout console displays the python `ZeroDivisionError` traceback.
   - The debugger maps the crash to line 12 and recommends adding zero division checks.

### TC5: Review Audience Modes (Student vs Developer)
1. In the workspace header, toggle **Review Mode** to **Student**.
2. Click **Initiate Code Review**.
3. Go to the **AI Feedback** tab.
4. **Expectation:**
   - Explanations use simple terms.
   - A list of **Recommended Learning Resources** appears with links (e.g. GeeksforGeeks, MDN) and beginner tips.
5. Toggle mode to **Developer** and re-run.
6. **Expectation:** The learning resource deck disappears, and advanced complexity indices (Big-O time and space) appear.

### TC6: Custom Rules Addition (Knowledge Base)
1. Go to the **Knowledge Base** tab.
2. Click **New Entry** at the top right.
3. Enter category `security`, language `javascript`, title `XSS prevention`, and instructions. Click **Publish Entry**.
4. Search for `XSS` in the top bar.
5. **Expectation:** The new entry is saved, retrieved, and rendered in the knowledge base cards grid.

---

## 3. IDE Integration Verification

Test that the VS Code extension loads and marks active files.

1. Launch the VS Code Extension Development Host (see [DEPLOYMENT.md](file:///c:/Users/pranitha/OneDrive/Desktop/AI_CODE_REVIEW/docs/DEPLOYMENT.md)).
2. Open a python file containing:
   ```python
   def faulty():
       # Bug: division by zero
       a = 10 / 0
       return a
   ```
3. Run `ReviewLLM: Review Current File` from the Command Palette.
4. **Expectation:**
   - A red wavy highlight appears under line 3 (`a = 10 / 0`).
   - Hovering over line 3 reveals a popup detailing the `ZeroDivisionError` and recommending a suggested fix.
