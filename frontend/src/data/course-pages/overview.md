## Course Introduction

In today’s AI-driven world, building a model is only half the journey. The real challenge is turning that model into a system that is reliable, scalable, and usable in practice.

Welcome to AC215/E115: Productionizing AI. This course focuses on the full lifecycle of machine learning systems, with a strong emphasis on Large Language Models (LLMs). We move beyond model development and focus on what it takes to make systems work in the real world.

You will work with containerization, cloud infrastructure, data pipelines, and modern training workflows. We will cover how to use LLM APIs, build applications around them, fine-tune models for specific tasks, and deploy them at scale. We will also explore emerging patterns such as agentic systems and workflows, where models interact with tools and operate as part of larger pipelines.

The goal is simple: by the end of the course, you should be able to design, build, and deploy a complete AI system.

---

## Learning Objectives

- Understand the MLOps, LLMOps, and AIOps ecosystem and its role in modern AI systems.
- Deploy and scale AI models, particularly LLM-based systems.
- Work with containerization, cloud infrastructure, data pipelines, and advanced training workflows.
- Build and operate scalable AI applications.

---

## Course Topics Overview

We have designed an in-depth curriculum to ensure a comprehensive understanding of modern AI systems and MLOps. The topics include (see the [full topics list](https://docs.google.com/spreadsheets/u/1/d/e/2PACX-1vSaPiVfDbW8OKMwQQZrOp8SiduXsg1rNHhMjUNjJNAlBrXrIxF6K5SiNiq53upolQ/pubhtml?gid=182104043&single=true)):


1. **Introduction:**
   - Begin with an understanding of the importance of MLOps and how it fits in the broader AI and software development ecosystem.

2. **LLM Topics:**
   - Large Language Models (LLMs) have led to many new tools and agents that students will use in their projects. In these lectures, we'll look at some of these tools, such as LangChain, LlamaIndex, and API-based workflows. We will also explore RAG, agent-based systems, and fine-tuning, including parameter-efficient methods such as Low-Rank Adaptation (LoRA).

3. **Virtual Environments and Virtual Machines:**
   - Learn the foundations of isolated software environments, their importance in AI development, and how virtual machines offer a layer of abstraction over physical hardware.

4. **Containers:**
   - Understand the concept of containerization using tools like Docker, and how they differ from virtual machines.

5. **Connecting to the Cloud: Networking, Authentication & Storage:**
   - Learn how to connect your local development environment to cloud infrastructure. Cover networking basics, service accounts and IAM-based authentication, and reading and writing to cloud storage from your code.

6. **Data Management, Versioning, and Monitoring:**
   - Learn how to label, version, and monitor the data behind your models. Use Label Studio to annotate raw data. Explore specialized tools for managing large-scale datasets for computer vision and language models.

7. **Advanced Training Workflows:**
   - We will cover advanced training workflows, including experiment tracking with tools like Weights & Biases, leveraging multi-GPU setups for accelerated training, exploring serverless training options using Vertex AI, and fine-tuning large language models (LLMs).

8. **Advanced Inference Workflows:**
   - Learn how to deploy, host, and serve models and large language models (LLMs) in production. Cover serverless inference with Cloud Functions, Cloud Run, and Vertex AI Online Prediction, then automate the full data → training → deployment sequence with Vertex AI Pipelines.

9. **System Tradeoffs: Performance, Cost, and Design Choices:**
   - Reason about the tradeoffs behind real system design decisions. Compare latency, throughput, and cost across serving options, and learn how to choose an architecture that fits your budget and your workload.

10. **Evaluating and Monitoring ML Systems in Production:**
    - Learn how to evaluate models and LLM-based systems beyond offline metrics, and how to monitor them after deployment. Cover data and model drift detection, logging, alerting, and testing strategies for production systems.

11. **App Design, Setup, and Code Organization:**
    - Best practices in designing user-centric AI applications, setting up your development environment, and organizing code for scalability and maintainability.

12. **APIs & Frontend:**
    - Learn about RESTful APIs to serve your models and design user interfaces for seamless user interactions.

13. **Automating Software Development: CI, Testing, and CI/CD:**
    - Build automated software development workflows. Cover unit testing and continuous integration, then move to full CI/CD pipelines with GitHub Actions and related tools so that changes are tested and deployed automatically.

14. **Deployment and Scaling: Kubernetes and Infrastructure as Code:**
    - Learn Kubernetes and its significance in deploying containerized applications. Start with a local cluster to understand pods, deployments, and services, then scale your application to production on a managed cloud cluster. Along the way, define and manage that infrastructure in code rather than by hand, using Pulumi to provision, version, and reproducibly deploy the resources your application depends on.

---

## Logistics

- **Location:** SEC 1.321
- **Meeting Time:** Tuesday and Thursday 12:45 - 2:45 PM
- **For Extension Students Only:** Via Zoom

---

## Technologies and Platforms
We use TensorFlow and PyTorch for examples, with a primary focus on Google Cloud Platform (GCP). 

Equivalent materials are available for AWS. However, we will not demonstrate AWS in lectures, and support for AWS-specific issues will be limited.

---

## Prerequisites

You are expected to be comfortable with the following:

1. **Python Programming**  
   - Writing functions, using classes, and organizing code into modules  
   - Familiarity with libraries such as NumPy, Pandas, and Matplotlib  

2. **Deep Learning (TensorFlow or PyTorch)**  
   - Basic model building, training, and data handling  
   - You should have trained simple models before  

3. **Command Line Basics**  
   - Navigating directories, running scripts, and basic file operations  

4. **Core Python Data Structures**  
   - Lists, dictionaries, and how to manipulate them  

5. **File I/O**  
   - Reading from and writing to files  

6. **Basic ML Concepts**  
   - What a model is, how it is trained, and how it is evaluated  

You do **not** need to be an expert in all of these areas. However, you should be comfortable learning quickly and working through technical material independently.

If you are unsure whether you meet these prerequisites, a simple guideline is:  
         If you have completed an introductory machine learning course and have written Python code for it, you should be prepared.

---

## Course Components

- **Lectures & Tutorials:** Each class is 2 hours. The first ~75 minutes focus on core concepts. The remaining time is a hands-on tutorial where we apply what you just learned.

- **Support Hours / TF Meetings:**
  - **Before MS1 (team formation):** Open support hours with TFs for general questions and guidance.
  - **After MS1:** Structured team meetings with your assigned TF (scheduled weekly), focused on project progress and feedback.
  - **MS2–MS4 evaluations:** Each of these milestones is evaluated **during your regular weekly TF meeting** as a **15-minute team presentation (with slides) to your assigned project TF**. The TF will ask questions of the team and of individual members about both the progress shown in the slides and the details of your GitHub repository.

- **Quizzes (6 total; best 4 of 6 count):** Short assessments to evaluate understanding of core concepts. Quizzes are **in-person for on-campus students** and **online for DCE students**.

- **Team Projects:** Collaborate with classmates to build a fully functional AI application.


- **Supplementary Readings:** Curated materials to deepen understanding. This field moves fast, so developing the habit of independent reading is part of the course.

---

## Team Projects

You will **design and build your own project** in a team (3-5 members). The staff will help you scope and refine the idea, but the direction and execution are yours.

By the end of the term, you should have a **working web or mobile application** that:
- includes a **meaningful modeling component** (beyond simple API calls), and
- is **fully evaluable** by the teaching staff (i.e., we can access, run, and assess all major components without relying on private or inaccessible systems).
The expectation is a project comparable in scope to a small production-ready application.

1. **Project Development**  
   - You will propose and develop your own project idea.  
   - The goal is to build something functional and meaningful, not just a prototype.  
   - Your project should integrate modeling with a complete system (data, training, deployment, and interface).

2. **Guided Example Project**  
   - The teaching team will develop a reference project throughout the semester ([Formaggio](http://formaggio.me)).  
   - Each week, we will highlight one aspect of this system and connect it to course topics.  
   - You are expected to apply similar ideas to your own project as the course progresses.

3. **Milestones and Evaluation**  
   - The project is structured through a series of milestones.  
   - These milestones are a major component of your grade and track your progress from idea to final system.  
   - **MS2, MS3, and MS4 are evaluated through a 15-minute team presentation (with slides) to your assigned project TF**, held during your regular weekly TF meeting. The TF will ask questions of the team and of individual students, covering both the slides and the contents of your GitHub repository. Every team member must be prepared to answer questions on **all** elements of the project — there is no "I didn't do that part." If you cannot speak to a component, that component is not considered learned, regardless of who wrote the code.
   - MS1 is submitted as a written proposal; MS5 is evaluated through the GitHub repository, final video, blog post, and the Dec 14 showcase.
   - Details for each milestone will be provided during the semester.

**In summary:**  
The goal is simple: build something real. Your project should be an end-to-end solution that includes modeling, infrastructure, and a usable interface.
