### Key Dates

- **Due:** 10/20

---

### Overview

These guidelines are meant to provide general direction for preparing your Milestone 2 submission. Every project is unique, so if you believe your work doesn't fully fit within these expectations, please discuss it with your TF. The goal is to ensure that your submission aligns with the spirit of the assignment while still reflecting the specific goals and scope of your project.

This milestone focuses on moving from proposal to implementation. You will set up reproducible working environments, containerize core components, and establish foundational data operations.

- **LLM teams:** Build an initial RAG-ready workflow (data collection, chunking, and vector database integration at a basic functional level).
- **Vision / other teams:** Build a robust data ingestion/preprocessing workflow and train or adapt a baseline model.

By the end, each team should have the required components in place and an **initial working app skeleton** informed by the Milestone 1 mock-up.

---

### Template Repository

**[dlops-io/project-setup-template](https://github.com/dlops-io/project-setup-template/tree/milestone2)**

---

### Objectives

Build a reproducible, containerized pipeline and establish practical data management and application foundations.

#### 1. Virtual Environment Setup

- Create virtual machines/environments to support containers.
- Provide clear setup documentation.

#### 2. End-to-End Containerized Pipeline

- Containerize each component (e.g., ingestion, preprocessing, RAG steps).
- Compose them into a single pipeline that runs start-to-finish.
- The pipeline must be runnable with one command (e.g., `docker compose up` or `make run`).
- Include basic data/version tracking (e.g., dataset snapshot IDs, file versions, or a lightweight versioning tool such as DVC; at minimum, document which data version each container uses).

#### 3. Teams Using LLMs

- Implement an initial RAG pipeline with data collection, chunking, and vector database integration.
- Show at least one complete retrieval flow from query to retrieved context (documented with example input and output).

#### 4. Teams Using Vision or Other Modalities

- Create a robust data ingestion and preprocessing pipeline.
- Train or adapt a baseline model for your task.
- Document early experiments and rationale for next technical decisions.

#### 5. Application Mock-up

- Submit an application mock-up/wireframe and a minimal working app skeleton showing basic UI and backend interaction. Placeholder functionality is acceptable for features beyond this basic interaction.
- Refine or extend the Milestone 1 design based on feedback and what you learned during implementation.

---

### Deliverables

#### 1. Virtual Environment Setup

- Screenshot of running instances (cloud or local).

#### 2. End-to-End Containerized Pipeline

- Dockerfiles + build instructions.
- `pyproject.toml` (using `uv`) for each container.
- Scripts or `docker-compose.yml` (when applicable).
- Documentation explaining the pipeline and exact run instructions.
- Evidence it works end-to-end (logs + a small sample input → output artifact).

#### 3. Teams Using LLMs

- Containerized RAG pipeline with scripts for chunking, vectorization, and DB integration.
- Documentation of the pipeline design and usage.
- Logs showing pipeline runs with sample data.
- Evidence of one end-to-end retrieval example.

#### 4. Teams Using Vision or Other Modalities

- Containerized pipeline for data ingestion and preprocessing.
- Baseline model training/adaptation scripts with documentation of datasets, key hyperparameters, and model versions.
- Experiment logs showing early results and planned next iteration.

#### 5. Application Mock-up

- Application mock-up/wireframe plus a minimal working app skeleton showing basic UI and back-end interaction.

---

### Submission Instructions

All deliverables must be submitted via GitHub (**milestone2** branch); submit the full commit hash on Canvas by **10:00 PM ET, October 20th**.

---

### TF Presentation & Evaluation

This milestone is evaluated through a **15-minute team presentation (with slides) to your assigned project TF**, held during your regular weekly TF meeting.

- **Format:** A 10–15-minute team presentation, approximately 10 minutes of group Q&A, and approximately five minutes per student for individual checks. Individual checks take place separately in a breakout room and include approximately 3–4 questions. You may navigate your repository; we assess understanding rather than memorized syntax.
- **Q&A scope:** The TF will ask questions of the team **and of individual members**, covering both the slides and the details of your GitHub repository (code, configs, infrastructure, tests, design choices).
- **Shared accountability:** Every team member must be prepared to answer questions on **all** parts of the project. "I didn't do that part" is not an acceptable answer. Divide the labor however you choose — but the *understanding* must be shared across the entire team.
- **Slides:** Bring slides that walk through what you built, why, and what's next. Be ready to navigate to specific files in your repository when asked.
- **Preparation:** Be ready to explain your contribution, walk through how to run a component, explain other parts of the project—including AI-assisted code—and discuss technical choices, testing, and debugging. Where applicable, explain how your containers access cloud resources and receive credentials without displaying secret values.

---

### Grading Rubric

Each student receives a score out of **10 points**. Partial credit is available for incomplete but correct work.

| Category | Points | What we assess |
|---|---:|---|
| GitHub repository (shared) | 2 | Organization, reproducibility, working deliverables, and collaboration |
| Presentation (shared) | 2 | Clear explanation of progress, technical choices, results, and next steps |
| Group Q&A (shared) | 2 | Team understanding of progress, system design, tradeoffs, and plans |
| Individual Q&A | 3 | Understanding of your contribution, the wider project, and technical reasoning |
| Overall execution / flair (shared) | 1 | Coherent execution and useful improvements beyond the required scope |
| **Total** | **10** | |
