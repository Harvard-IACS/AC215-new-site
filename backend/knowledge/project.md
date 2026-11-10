# Team project

## Build an end-to-end AI application

Design and develop a working web or mobile application with a meaningful modeling component, infrastructure, and a usable interface. The project should connect data, training, inference, deployment, and the user experience. A frontend-only project or a simple wrapper around an external model API is not sufficient.

Choose a problem that matters to your team and its stakeholders. Aim for the scope of a small production-ready application, with clear evidence that the system works. Staff help refine the scope, but your team owns its direction and execution.

The teaching staff must be able to access, run, and evaluate all major components. Private or inaccessible dependencies can make a component unevaluable and reduce credit. Raise access concerns with your TF early.

## Form a team

Teams have three to five members. Find teammates through [Ed Discussion](https://edstem.org/us/courses/97373/discussion) or independently. Ed requires course access. Register the team name and all member names in the course team-registration spreadsheet supplied by staff.

Exceptions to the three-to-five-person requirement are uncommon. A two-person team may be approved in specific circumstances by an instructor. Teams of six or more have not been allowed. Larger teams are expected to deliver proportionally greater scope and complexity.

## Share understanding

Divide the work as your team chooses, but every member must understand all parts of the project: data, code, models, containers, cloud infrastructure, APIs, frontend, tests, deployment, and design choices.

During evaluation, the TF asks both team and individual questions and may ask you to navigate the repository or explain how to run a component. You may navigate the repository; the goal is understanding rather than memorizing syntax. Be ready to explain AI-assisted code and why the team chose its tools. “I did not work on that part” does not show the required understanding.

## Develop the system through five milestones

| Milestone | Due at 10:00 PM ET | Weight | Main outcome |
| --- | --- | ---: | --- |
| MS1 | September 29 | 8% | Team and project proposal with data, scope, and preliminary design |
| MS2 | October 20 | 14% | Reproducible, containerized data pipeline and initial app skeleton |
| MS3 | November 12 | 18% | Model integrated into a running backend, with training, API, deployment, and monitoring |
| MS4 | December 1 | 18% | Locally working user-facing app, design document, CI, and at least 50% API/backend test coverage |
| MS5 | December 15 | 24% | Kubernetes deployment, CI/CD, at least 70% API/backend test coverage, final communication, and showcase |

The project contributes 82% of the course grade. The remaining 18% comes from the best four of six quizzes.

MS1 is a written PDF proposal on Canvas. MS2–MS4 are evaluated through a team presentation with slides and TF questions during the regular weekly meeting. Submit the relevant milestone branch's full commit hash on Canvas. MS5 uses the main branch, final video, blog post, review forms, and showcase.

See the milestone notes for detailed deliverables. The team should explain what it built, why, the evidence it works, and the next steps. Screenshots and logs should show results without exposing credentials.

## Choose an appropriate technical scope

For MS1, consider at least two or three of these dimensions: large or heterogeneous data, scalability, challenging models, and computationally expensive inference. Describe measurable success, the stakeholders, data quality risks, a preliminary interface, and a feasible development plan.

LLM teams build an initial RAG workflow in MS2, including collection, chunking, and vector database integration. Vision or other teams build ingestion/preprocessing and a baseline model. Subsequent milestones connect training, serving, monitoring, a user interface, tests, and deployment.

GCP is the course's primary platform. AWS is permitted, with equivalent materials but limited AWS-specific support. Discuss project-specific substitutions or access concerns with your TF.

## Support, deadlines, and final showcase

Before MS1, TF support hours offer general guidance. After team formation, meet weekly with your assigned TF for progress and feedback. Use [Ed Discussion](https://edstem.org/us/courses/97373/discussion) for technical questions and ac215harvard@gmail.com for administrative or logistical issues.

There are four late days per student across MS1–MS4, at most two on one milestone. A group submission deducts the same number from every member. Late days cannot be transferred, pooled, or borrowed. MS5 permits no late days or extensions.

The showcase is scheduled for December 14, subject to change. Each team has an assigned one-hour booth slot for visitors; this is not a one-hour presentation. The app must be fully functional on GCP or AWS, with a public URL and a QR code. Most teams receive a monitor; arrange any extra equipment. DCE students are welcome but not required to attend.
