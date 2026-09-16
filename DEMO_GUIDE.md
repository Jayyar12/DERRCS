# DERRCS Live Demo Script

This guide will help you demonstrate the end-to-end functionality of the Digital Emergency Reporting and Response Coordination System (DERRCS) to your team. 

The scenario follows a **Major Warehouse Fire** from the moment citizens report it, through AI clustering, dispatcher triage, algorithmic unit allocation, and final AI hospital handover.

---

## 🛠️ Phase 0: Start the System (Show the Microservices)

Open **three separate terminals** to show how the system components communicate asynchronously via RabbitMQ.

**Terminal 1: Infrastructure & Database**
```bash
docker compose up -d postgres rabbitmq
```
*Talking point: We use Docker for PostgreSQL (with PostGIS for spatial data) and RabbitMQ.*

**Terminal 2: Node.js Ingestion API**
```bash
cd services/ingestion
npm run dev
```
*Talking point: This is the main backend. It handles HTTP requests, JWT auth, and saves to the DB.*

**Terminal 3: Python Algorithmic Worker**
```bash
cd services/algorithms
source venv/bin/activate
python src/worker.py
```
*Talking point: This is our background worker. It listens to RabbitMQ events and runs our heavy algorithms (DBSCAN, Hungarian) and AI (Gemini) without slowing down the Node.js API.*

---

## 🔥 Phase 1: The Incident (Show AI Clustering)

Open a **4th Terminal** to act as the client/API consumer. We will simulate two citizens reporting a fire from slightly different locations.

```bash
# 1. First Citizen Report
curl -s -X POST http://localhost:5000/api/v1/reports \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyType": "Fire",
    "description": "Thick black smoke coming from a warehouse.",
    "emergencyCoordinates": {"latitude": 8.5385, "longitude": 124.7533},
    "standardizedAnswers": {"peopleTrapped": true, "structureType": "Commercial"}
  }' | jq
```
👀 **Direct the team to Terminal 3:** Point out that the Python worker received the report but says `"Only 1 unclustered reports... Waiting for more."` (DBSCAN requires at least 2 points by default to form a cluster to filter out noise).

```bash
# 2. Second Citizen Report (Nearby)
curl -s -X POST http://localhost:5000/api/v1/reports \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyType": "Fire",
    "description": "Flames visible from the street, warehouse is burning.",
    "emergencyCoordinates": {"latitude": 8.5386, "longitude": 124.7534},
    "standardizedAnswers": {"peopleTrapped": true, "structureType": "Commercial"}
  }' | jq
```
👀 **Direct the team to Terminal 3:** Point out that DBSCAN successfully grouped the reports, created an `incident_candidate`, and triggered the AI to generate a `ClusterIntake` summary!

---

## 🎧 Phase 2: Dispatcher Triage (Show Hungarian Allocation)

Now, act as the MDRRMO Dispatcher. We will use environment variables so you don't have to manually copy/paste IDs during the demo.

```bash
# 1. Login as Dispatcher and save the JWT token
export DISPATCHER_TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username": "dispatcher_tagoloan", "password": "password123"}' | jq -r '.data.token')

# 2. Fetch pending Candidates and grab the ID
export CANDIDATE_ID=$(curl -s -X GET http://localhost:5000/api/v1/candidates -H "Authorization: Bearer $DISPATCHER_TOKEN" | jq -r '.data[0].id')
echo "Candidate ID: $CANDIDATE_ID"

# 3. Confirm the Candidate into an Active Incident
export INCIDENT_ID=$(curl -s -X POST http://localhost:5000/api/v1/candidates/$CANDIDATE_ID/confirm -H "Authorization: Bearer $DISPATCHER_TOKEN" | jq -r '.data.incidentId')
echo "Incident ID: $INCIDENT_ID"
```
👀 **Direct the team to Terminal 3:** Look at the Python worker! The moment the candidate was confirmed, it triggered the **Modified Hungarian Algorithm**. It fetched available units (with GPS locations), padded the matrix, calculated travel times, and recommended the optimal unit for dispatch.

```bash
# 4. Dispatch the recommended unit (Rescue Alpha)
export ASSIGNMENT_ID=$(curl -s -X POST http://localhost:5000/api/v1/incidents/$INCIDENT_ID/assign -H "Authorization: Bearer $DISPATCHER_TOKEN" -H "Content-Type: application/json" -d '{"responseUnitId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}' | jq -r '.data.assignmentId')
```

---

## 🚑 Phase 3: Response & Resolution (Show AI Handoff)

Now, act as the Responder on the ground.

```bash
# 1. Login as Response Unit (Rescue Alpha)
export RESPONDER_TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username": "rescue_alpha", "password": "password123"}' | jq -r '.data.token')

# 2. Mark arrival On-Scene
curl -s -X PATCH http://localhost:5000/api/v1/assignments/$ASSIGNMENT_ID/status -H "Authorization: Bearer $RESPONDER_TOKEN" -H "Content-Type: application/json" -d '{"status": "OnScene"}' | jq

# 3. Submit Field Assessment & Pre-Hospital Care Report
curl -s -X POST http://localhost:5000/api/v1/incidents/$INCIDENT_ID/field-assessment \
  -H "Authorization: Bearer $RESPONDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignmentId": "'$ASSIGNMENT_ID'",
    "patientName": "John Doe",
    "approximateAge": 45,
    "gender": "Male",
    "consciousnessLevel": "Alert",
    "injuriesObserved": ["Smoke inhalation", "Minor burns"],
    "interventionsRendered": ["Administered O2", "Applied burn dressing"],
    "disposition": "TransportedNMMC",
    "destinationFacility": "Northern Mindanao Medical Center"
  }' | jq
```
👀 **Direct the team to Terminal 3 for the finale:** Point out that submitting the field assessment automatically triggered the **AI Handover Debrief**. The system combined the original citizen reports with the responder's casualty data to generate a clean, structured medical handover for the receiving hospital.

---

## 🧹 Cleanup (Resetting for the next demo)
If you want to run the demo again later, you can easily wipe the database and re-seed it:

```bash
# In Terminal 1 (or any terminal)
docker compose down -v
docker compose up -d postgres rabbitmq
```
This drops the volumes and re-runs `01-schema.sql` and `02-initial-seeds.sql` so you have a fresh slate.
