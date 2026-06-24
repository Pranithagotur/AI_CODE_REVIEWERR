# Project Diagrams: AI-Based Code Review System

This document outlines the System Architecture, Use Cases, and Entity-Relationship model for the application.

---

## 1. System Architecture Diagram

This diagram displays the integration of the React client, IDE extension, REST API routing, compilation engine, and LLM providers.

```mermaid
graph TD
    Client[React Frontend Dashboard] <-->|REST API / HTTP| Server[Express Backend API Server]
    Extension[VS Code Extension] <-->|REST API / HTTP| Server
    
    subgraph Server Internals
        Server --> Auth[Auth Controller]
        Server --> DB[(MySQL / SQLite)]
        Server --> Rules[Static Rule Validation Engine]
        Server --> Sandbox[Runtime Execution Sandbox]
        Server --> AI[LLM API Integration Service]
        Server --> KB[Knowledge Base CRUD Manager]
    end
    
    subgraph Sandbox Environment
        Sandbox -->|Option A: Docker CLI| DockerEnv[Docker Containers Python/Node/GCC/JDK]
        Sandbox -->|Option B: Process Fallback| Subprocess[Local safe execute - timeout & filter]
    end
    
    subgraph LLM Model Nodes
        AI -->|Gemini API SDK| Gemini[Gemini-1.5-Flash Model]
        AI -->|Local/Offline API| OfflineSim[Offline AI Review Simulator]
    end
```

---

## 2. Use Case Diagram

This diagram describes interactions between developers, student users, the backend server, and the Gemini model.

```mermaid
leftToRightDirection
actor Developer
actor Student
actor "Gemini AI Model" as AIModel

rectangle "AI-Based Code Review System" {
    usecase "Register / Authenticate Account" as UC1
    usecase "Submit Code for Review" as UC2
    usecase "Inspect Static Rules Violations" as UC3
    usecase "Execute Code in Sandbox Console" as UC4
    usecase "Request AI Feedback & Grade" as UC5
    usecase "View Big-O Complexity Metrics" as UC6
    usecase "View Basic Learning Tutorials" as UC7
    usecase "Search Programming Knowledge Base" as UC8
    usecase "Contribute Custom Rule Entries" as UC9
    usecase "View Performance Analytics Chart" as UC10
    usecase "Trigger Review inside VS Code IDE" as UC11
}

Developer --> UC1
Developer --> UC2
Developer --> UC3
Developer --> UC4
Developer --> UC5
Developer --> UC6
Developer --> UC8
Developer --> UC9
Developer --> UC10
Developer --> UC11

Student --> UC7
Student --> UC2

UC5 ..> AIModel : Invokes API
UC6 ..> AIModel : Invokes API
```

---

## 3. ER Diagram (Entity-Relationship)

This diagram details database fields and foreign key mappings between user sessions, submissions history, and rules tables.

```mermaid
erDiagram
    USERS {
        int id PK "AUTOINCREMENT"
        string name "VARCHAR(255)"
        string email "VARCHAR(255) UNIQUE"
        string password "VARCHAR(255) HASH"
        datetime created_at "TIMESTAMP"
    }
    
    CODE_REVIEWS {
        int id PK "AUTOINCREMENT"
        int user_id FK "FOREIGN KEY REFERENCES users(id)"
        string language "VARCHAR(50)"
        string source_code "LONGTEXT"
        string mode "VARCHAR(50)"
        json ai_feedback "LONGTEXT"
        json rule_feedback "LONGTEXT"
        json runtime_feedback "LONGTEXT"
        datetime created_at "TIMESTAMP"
    }
    
    KNOWLEDGE_BASE {
        int id PK "AUTOINCREMENT"
        string title "VARCHAR(255)"
        string category "VARCHAR(100)"
        string language "VARCHAR(50)"
        string pattern "LONGTEXT"
        string solution "LONGTEXT"
    }

    USERS ||--o{ CODE_REVIEWS : creates
```
