# Project milestones

All milestones are due at **10:00 PM ET** on the dates below. Milestones contribute 82% of the course grade.

| Milestone | Due | Course weight |
| --- | --- | ---: |
| MS1: Proposal and team formation | September 29 | 8% |
| MS2: MLOps infrastructure | October 20 | 14% |
| MS3: Integration and deployment | November 12 | 18% |
| MS4: Design and development | December 1 | 18% |
| MS5: Deployment and final delivery | December 15 | 24% |

Each student has four late days across MS1–MS4, at most two on one milestone. A late group submission deducts the same number of days from every member. Days cannot be transferred, pooled, or borrowed. MS5 has no late days or extensions.

Discuss project-specific needs with your TF when these guidelines do not fit the project. Use [Ed Discussion](https://edstem.org/us/courses/97373/discussion) for questions. Ed requires course access.

## MS1: Proposal and team formation

**Due September 29; 8% of the course grade.**

Form a team of three to five students and register its name and members in the staff-provided spreadsheet. Submit a Statement of Work as a PDF on Canvas. Aim for one to two pages; up to three is acceptable when needed.

Include:

- Project title, team member names, and email addresses.
- Background and motivation: two to four paragraphs explaining the topic, stakeholders, and importance.
- A one- or two-sentence problem statement.
- Data sources, dataset contents, key attributes, relevance, quality concerns, and an initial plan for those concerns.
- Scope, objectives, and meaningful success measures.
- A preliminary application sketch or wireframe and the main user flow.
- Supporting references, risks, limitations, and tentative development milestones.

Choose methods the team understands. Consider at least two or three of: large or heterogeneous data, scalability, challenging models, and computationally expensive inference. Technical choices may evolve after feedback. Proposals missing relevant available data or scope and preliminary design will not be accepted.

## MS2: MLOps infrastructure

**Due October 20; 14% of the course grade.**

Move from proposal to implementation with reproducible environments, containers, data operations, and an initial application skeleton.

Required work:

1. Set up virtual machines/environments that support the containers and document setup.
2. Containerize each pipeline component and run the complete pipeline with one command, such as `docker compose up` or `make run`.
3. Track the data version used by each component through snapshot IDs, file versions, DVC, or another documented approach.
4. LLM teams: implement collection, chunking, vectorization, and basic vector database integration. Demonstrate one complete query-to-retrieved-context flow.
5. Vision or other teams: implement ingestion/preprocessing, train or adapt a baseline model, and document early results and next decisions.
6. Refine the MS1 wireframe and provide a minimal app with basic frontend/backend interaction. Other features may use placeholders at this stage.

Deliver running-instance screenshots, Dockerfiles and build instructions, a `pyproject.toml` using uv for each container, pipeline scripts or Compose configuration, exact run instructions, sample input/output, and logs. Document datasets, model versions, key hyperparameters, and experiments where relevant.

Submit code on the **`milestone2` branch** and the **full commit hash on Canvas** by the deadline. Present the work with slides to your assigned TF during the weekly meeting. The presentation is 10–15 minutes, followed by group and individual checks; confirm the overall meeting timing with your TF. Individual checks assess project understanding, not memorized syntax, and allow repository navigation.

Each student receives a score out of 10: repository 2, presentation 2, group Q&A 2, individual Q&A 3, and overall execution/flair 1. Partial credit is available for incomplete but correct work.

## MS3: Integration and deployment

**Due November 12; 18% of the course grade.**

Integrate the model into a running backend with training, deployment, API access, and monitoring.

Template repository: [dlops-io/project-setup-template, milestone3 branch](https://github.com/dlops-io/project-setup-template/tree/milestone3).

Required work:

- Track experiments with Weights & Biases or an equivalent tool.
- Complete at least one logged, reproducible serverless training run on Vertex AI or a documented equivalent. Multi-GPU/distributed training is required only when applicable.
- Deploy the model or API with Cloud Functions or Cloud Run. Make it public or accessible to teaching staff; discuss authentication concerns with the TF.
- Build at least one automated ML pipeline in Vertex AI Pipelines or an equivalent, covering preprocessing, training, and/or evaluation.
- Add production monitoring. At minimum, implement Cloud Logging or equivalent logging, and explain access to logs or dashboards.
- Provide a working, documented prediction API with endpoints, input/output formats, example requests, and unit or integration tests.

Include code and a README explaining changes since MS2, reproducible training, deployment/redeployment, the ML pipeline, and API use. Include screenshots of a tracked training run and a deployed service responding to a request.

Submit code on the **`milestone3` branch** and the **full commit hash on Canvas**. Give a 15-minute team presentation with slides, followed by TF questions, during the weekly meeting. All members must explain the slides and repository.

## MS4: Design and development

**Due December 1; 18% of the course grade.**

Deliver a user-facing app that integrates prior components, with an application design document, continuous integration, and automated tests. It must be deployment-ready locally: all services start with one command, frontend and backend interact, and startup needs no manual configuration.

Required work:

- Extend the MS3 API and build a frontend that supports end-to-end model interaction locally.
- Provide a clean desktop layout, loading indicators, and visible error/empty states. Mobile responsiveness is optional.
- LLM teams typically use a chat interface with relevant citations. Vision/other teams typically use upload and result views.
- Containerize the frontend alongside the API and prior services. Document local URLs and ports.
- Automate builds, linting, and tests on commits or pull requests with GitHub Actions or an equivalent CI tool.
- Include unit, integration, and system/end-to-end tests, coverage reports, and instructions for running tests locally.

The design document must include UI mockups/wireframes and main user flows, solution architecture, technical architecture, a data-flow diagram, a sequence diagram for a primary runtime flow, API contracts, and code organization separating frontend, backend, and data science tasks.

**At least 50% code coverage is required for API and backend code.** Frontend and data science notebook coverage is encouraged but is not part of that required threshold. Include a screenshot or short demo of frontend-to-API interaction.

Submit code on the **`milestone4` branch** and the **full commit hash on Canvas**. Give a 15-minute team presentation with slides, followed by TF questions, during the weekly meeting. Full cloud deployment, scaling, and deploy-on-merge belong to MS5.

## MS5: Deployment and final delivery

**Due December 15; 24% of the course grade. No late submissions or extensions.** The showcase is scheduled for **December 14**, subject to change.

Required work:

1. Deploy the application to Kubernetes. Demonstrate scaling replicas up and down, documenting commands and screenshots or logs.
2. Build CI/CD using GitHub Actions with unit tests across every container, API integration tests on each pull request, and deployment to Kubernetes when changes merge into `main`.
3. Achieve **at least 70% line coverage for API and backend code**. Document untested functions/modules. Frontend and notebook coverage is encouraged but is not part of that required threshold.
4. Integrate preprocessing, training, and evaluation into a production ML workflow. Trigger retraining and deployment with new data or code changes. Define performance thresholds and validate models before deploying them.

Final deliverables:

- **GitHub repository, `main` branch:** organized code and a README covering prerequisites, setup, deployment, use, known issues, and limitations.
- **Six-minute video:** MP4, at least 720p; problem, solution, architecture, working demo, challenges, and solutions.
- **Medium blog post:** 600–800 words for a general audience, with helpful visuals.
- **Self and peer reviews.**
- **Showcase:** a fully functional app hosted on GCP or AWS, a public URL, and a QR code. Each team has an assigned one-hour booth slot for visitors, not a one-hour talk. Most teams receive monitors; arrange extra equipment. DCE students may attend but are not required to.

Submit the repository link, video, blog link, and review forms through the course submission portal by 10:00 PM ET on December 15.

The MS5 rubric assigns repository 10 points, video 7, blog 4, and showcase 5. This within-milestone rubric is separate from MS5's 24% course weight. Best of Show considers innovation/impact, technical complexity/robustness, and clarity of presentation.
