# PPT Presentation Outline: AI-Based Code Review System

This document provides a slide-by-slide structure for the PPT presentation of the project.

---

## Slide 1: Title Slide
* **Title:** AI-Based Code Review System Using Large Language Models with Hybrid Validation and IDE Integration
* **Subtitle:** Secure sandboxing, rule-based checks, LLM reviews, and VS Code integration.
* **Presenter Information:** [Your Name / Team Name]
* **Design Tip:** Dark blue background, code symbols, modern clean layout.

---

## Slide 2: Project Overview
* **Objective:** Create an intelligent code assistant that combines compiler validation, static checker rules, and LLM reasoning.
* **Key Components:**
  - **Static rule engine:** Instant checks for code smells and naming.
  - **Isolated sandbox:** Real execution to test for crashes and infinite loops.
  - **LLM diagnostics:** AI reasoning for refactoring and complexity.
  - **IDE extension:** Inline warnings directly in VS Code.

---

## Slide 3: Problem Statement
* **The Developer Challenge:**
  - Modern applications suffer from security leaks, poor naming, and logic errors.
  - Traditional static analysis is too strict and lacks reasoning.
  - LLMs can explain concepts but can't verify if code compiles or runs.
* **Solution:** A hybrid approach that tests code dynamically, checks it statically, and reviews it with AI.

---

## Slide 4: Proposed Hybrid Architecture
* **Review Steps:**
  1. **Source Code Submission:** User inputs code in React Monaco Editor or VS Code.
  2. **Rule Validation Engine:** Instant regex checks for unused variables, hardcoded secrets, and memory leaks.
  3. **Sandbox Execution:** Runs code in Docker or a safe local process with a 2-second timeout to catch runtime crashes.
  4. **AI Review Service:** Sends code to the Gemini API (using structured JSON) for quality grades and Big-O complexity analysis.
  5. **Merged Feedback:** Returns all reports to the user.

---

## Slide 5: System Workflow Diagram

```
[ Code Input ] 
       │
       ├───► [ Rule Engine ] ───► Standard Violations (Unused vars, memory leaks)
       │
       ├───► [ Sandbox Runner ] ─► Compilation/Execution Logs & Stderr Stack-trace
       │
       └───► [ LLM Reviewer ] ──► Quality Grade, Refactoring, Time/Space Complexity
       │
       ▼
[ Combined Feedback ] ───► Displayed in Dashboard & VS Code Editor
```

---

## Slide 6: Database & Entity Relationship Model
* **Database Engine:** MySQL (with SQLite fallback).
* **Tables:**
  - **Users:** Registration and credentials (hashed with bcrypt).
  - **CodeReviews:** Saves historical submissions, code snippets, and review reports.
  - **KnowledgeBase:** Anti-patterns, common mistakes, and recommended solutions.
* **Benefit:** Allows tracking improvements and browsing common bugs.

---

## Slide 7: Rule Engine Static Analysis
* **Language Support:** Python, JavaScript, C++, Java.
* **Static Rule Audits:**
  - **Unused variables:** Scans declarations and flags variables that are never read.
  - **Memory leaks:** Checks for raw pointers (`new` without `delete` in C++).
  - **Secrets detection:** Flags hardcoded passwords and API keys.
  - **Duplicate code:** Identifies copy-pasted blocks.
  - **Naming conventions:** Checks camelCase and snake_case standards.

---

## Slide 8: Isolated Sandbox Mechanics
* **Resource Limits:** Docker runs with `--memory=128m --cpus=0.5 --network=none`.
* **Fallback Executions:** Local execution with a 2-second timeout.
* **Security Filter:** Scans code for restricted commands (`os`, `child_process`, `system(`, `java.net.`) before running.
* **Error Mapping:** Parses tracebacks using regular expressions to highlight the exact line that crashed.

---

## Slide 9: LLM Prompts & Target Modes
* **Structured Output:** Enforces JSON responses from the Gemini API to avoid parsing errors.
* **Student Mode:**
  - Beginner-friendly language.
  - Includes links to tutorials and documentation.
  - Offers simple learning tips.
* **Developer Mode:**
  - Focuses on performance, memory usage, and security checks.
  - Calculates time and space Big-O complexity.

---

## Slide 10: Interactive UI Dashboard
* **Built With:** React, TypeScript, Tailwind CSS, Monaco Editor.
* **Key Features:**
  - Split-pane layout (Code editor on the left, reports on the right).
  - Interactive language and review mode selectors.
  - Visual quality grade badge (A-F) with color coding.
  - Interactive graphs for history and analytics (recharts).
  - Knowledge base explorer.

---

## Slide 11: VS Code Extension
* **Features:**
  - Command: `ReviewLLM: Review Current File`.
  - Integrates with VS Code Diagnostics to show wavy underlines under errors.
  - Hover tips: Displays AI suggestions when hovering over highlighted lines.
  - Custom configuration for backend URLs and review modes.

---

## Slide 12: Deployment Guide
* **Quick Start (SQLite + Local Sandbox):**
  - Run `npm install` in backend and frontend.
  - Start the backend with `npm run dev` and frontend with `npm run dev`.
* **Production Build (Docker + MySQL):**
  - Run `docker-compose up --build` to deploy the database, backend, and frontend containers.

---

## Slide 13: Summary & Conclusion
* **Summary:** The Hybrid Code Review platform provides developers with rule-based checks, sandbox testing, and AI feedback in one place.
* **Future Work:**
  - Adding team collaboration features.
  - Automatic pull request reviews on GitHub.
  - Integrating AST parsing for better analysis.
* **Thank You!** Questions?
