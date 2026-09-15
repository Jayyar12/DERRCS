# DERRCS — Project Rules & AI Development Guardrails

This file instructs AI coding assistants and developers working on the DERRCS codebase. Follow every rule strictly.

---

## 1. Grounding and Anti-Hallucination Rules

1. Treat `CONTEXT.md` and `Digital_Emergency_Reporting_and_Response_Coordination_System_Documentation.md` as ground truth.
2. If a prompt asks for a feature not in `CONTEXT.md`, decline the request or point out that it is out of scope.
3. Never invent new database tables, table columns, or relationships. Refer to `database-schema.sql`.
4. Never invent new REST endpoints or WebSocket events. Refer to `api-contracts.md`.
5. Never change the approved tech stack without explicit user instruction. Use React, Node.js, Python, PostgreSQL with PostGIS, RabbitMQ, and Socket.IO.

---

## 2. Architecture & Design Rules

1. Maintain loose coupling between services. Microservices must communicate via RabbitMQ messages or REST endpoints, never by sharing database connection pools.
2. The Node.js backend handles HTTP ingestion, authentication, and state machine transitions.
3. The Python backend handles computational algorithms (Streaming DBSCAN and Hungarian optimization) and calls the Gemini API.
4. Keep the Dispatcher in the loop. The resource allocation engine recommends assignments, but dispatchers confirm or adjust them. Never execute silent automatic dispatches.
5. Store all spatial coordinates in PostgreSQL using PostGIS geometry format with spatial reference identifier 4326 (`SRID=4326;POINT(lng lat)`).

---

## 3. Coding and Code Quality Standards

1. Use active voice and write clear, short functions.
2. Handle errors explicitly in every route and message consumer. Never swallow errors with empty `catch` blocks.
3. Validate and sanitize all user input at the Ingestion Service before publishing messages to RabbitMQ.
4. Store sensitive secrets (database passwords, JWT secret keys, Gemini API keys) in `.env` files. Never hardcode secrets in code files.
5. Provide structured JSON error responses with this format:
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Latitude must be between -90 and 90."
     }
   }
   ```

---

## 4. State Machine Transition Enforcement

Enforce the six incident states in code:
`Reported` $\rightarrow$ `Validated` $\rightarrow$ `Dispatched` $\rightarrow$ `Active` $\rightarrow$ `Resolved` $\rightarrow$ `Closed`.

* Reject any update that skips a state (for example, attempting `Reported` to `Dispatched`).
* Require a valid `field_assessment` record before permitting an incident transition from `Active` to `Resolved`.
* Implement timeouts in Node.js using BullMQ or scheduled timers for the 5-minute and 10-minute escalations.
