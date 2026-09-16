# DERRCS — Technology Stack & Environment Setup Guide

This document explains the installed technology stack, directory structure, and step-by-step instructions to run the DERRCS microservices.

---

## 1. Directory Structure

The repository organizes backend services, algorithm workers, and the frontend into independent services:

```text
Digital_Emergency_Reporting_and_Response_Coordination_System/
├── .agents/skills/          # Installed development skills and domain guide
├── scripts/
│   └── simulate_disaster.py # Citizen report load generator for Tagoloan
├── seeds/
│   └── 02-initial-seeds.sql # Default roles, test accounts, units, and boundaries
├── services/
│   ├── algorithms/          # Python 3.12 algorithmic microservice
│   │   ├── src/
│   │   │   ├── clustering.py # Streaming DBSCAN duplicate detection
│   │   │   ├── allocation.py # Modified Hungarian resource allocation
│   │   │   └── summarizer.py # Google Gemini AI summarization engine
│   │   ├── requirements.txt # Python dependencies
│   │   └── venv/            # Dedicated Python virtual environment
│   ├── frontend/            # React Progressive Web App (Vite + Leaflet)
│   └── ingestion/           # Node.js Express & WebSocket service
│       ├── src/
│       │   ├── config/      # Database pool configuration (db.js)
│       │   ├── middleware/  # JWT auth and Multer upload handlers
│       │   ├── routes/      # Auth, reports, candidates, incidents, units, assignments
│       │   └── index.js     # API entry point and Socket.IO server
│       └── package.json     # Node dependencies
├── uploads/                 # Local media storage directory
├── .env.example             # Environment template
├── .env                     # Local active environment variables
├── api-contracts.md         # REST, WebSocket, and RabbitMQ specifications
├── CONTEXT.md               # System ground truth and architecture rules
├── database-schema.sql      # PostgreSQL + PostGIS table definitions
├── docker-compose.yml       # Infrastructure orchestration file
└── PROJECT_RULES.md         # Behavioral rules for developers and AI
```

---

## 2. Environment Configuration

The system uses a root `.env` file for all services:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and add your Google Gemini API key:
   ```bash
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```
3. Configure hosts based on your deployment mode:
   * **Docker Compose (Option A, Default):** Keep `POSTGRES_HOST=postgres` and `RABBITMQ_HOST=rabbitmq`.
   * **Native Setup (Option B):** Change `POSTGRES_HOST=localhost` and `RABBITMQ_HOST=localhost`.

---

## 3. Database & Message Broker Setup

The system requires PostgreSQL with the PostGIS spatial extension and RabbitMQ.

### Option A: Using Docker (Recommended for Team Deployment)

If your machine has Docker installed, start both containers with one command:
```bash
docker compose up -d
```

This command automatically:
* Starts PostgreSQL with PostGIS on port `5432`.
* Executes `database-schema.sql` and `seeds/02-initial-seeds.sql` on first launch.
* Starts RabbitMQ on port `5672` and its management dashboard on port `15672`.

To install Docker on Ubuntu/Debian if not already installed:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
```
*(Log out and back in after adding your user to the docker group).*

### Option B: Using Native PostgreSQL & RabbitMQ

If you run PostgreSQL and RabbitMQ directly on your local system:

#### 1. PostgreSQL with PostGIS Setup
1. Ensure PostgreSQL and PostGIS are installed:
   ```bash
   sudo apt update
   sudo apt install -y postgresql postgresql-postgis
   ```
2. Create the database and user matching your `.env`:
   ```bash
   sudo -u postgres psql -c "CREATE USER derrcs_user WITH PASSWORD 'derrcs_password_2026';"
   sudo -u postgres psql -c "CREATE DATABASE derrcs_db OWNER derrcs_user;"
   ```
3. Enable PostGIS on `derrcs_db` as superuser (required before schema creation):
   ```bash
   sudo -u postgres psql -d derrcs_db -c "CREATE EXTENSION IF NOT EXISTS postgis;"
   ```
4. Apply the database schema and seed data:
   ```bash
   PGPASSWORD=derrcs_password_2026 psql -U derrcs_user -d derrcs_db -h localhost -f database-schema.sql
   PGPASSWORD=derrcs_password_2026 psql -U derrcs_user -d derrcs_db -h localhost -f seeds/02-initial-seeds.sql
   ```

#### 2. Native RabbitMQ Setup
1. Install RabbitMQ Server:
   ```bash
   sudo apt install -y rabbitmq-server
   ```
2. Enable the RabbitMQ Management Dashboard:
   ```bash
   sudo rabbitmq-plugins enable rabbitmq_management
   ```
3. Create the RabbitMQ broker user matching your `.env`:
   ```bash
   sudo rabbitmqctl add_user derrcs_rabbit rabbit_password_2026
   sudo rabbitmqctl set_user_tags derrcs_rabbit administrator
   sudo rabbitmqctl set_permissions -p / derrcs_rabbit ".*" ".*" ".*"
   ```
4. Access the web management dashboard at `http://localhost:15672` (Login: `derrcs_rabbit` / `rabbit_password_2026`).

---

## 4. Ingestion Service (Node.js & Express)

The Ingestion Service accepts incoming citizen reports, validates data, and emits real-time WebSocket events.

* **Path:** `services/ingestion/`
* **Installed Packages:** `express`, `socket.io`, `amqplib`, `pg`, `bcryptjs`, `jsonwebtoken`, `multer`, `cors`, `dotenv`, `uuid`.
* **Run in Development Mode:**
  ```bash
  cd services/ingestion
  npm run dev
  ```
* **Run in Production Mode:**
  ```bash
  cd services/ingestion
  npm start
  ```
* **Verify Health:** Visit `http://localhost:5000/health` in your browser.

### Default Test Accounts

All accounts use the default password: `password123`

| Role | Username | Full Name / Description |
|---|---|---|
| **Admin** | `admin` | Jay-ar Guiroy (System Administrator) |
| **Dispatcher** | `dispatcher_tagoloan` | MDRRMO Dispatcher 1 (Operations Center) |
| **ResponseUnit** | `rescue_alpha` | Rescue Unit Alpha Team (Ambulance `RESCUE-01`) |
| **ResponseUnit** | `fire_bravo` | BFP Tagoloan Engine 1 (Fire Truck `FIRE-ENGINE-01`) |

Test login via `curl`:
```bash
curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dispatcher_tagoloan","password":"password123"}' | jq
```

---

## 5. Algorithmic Service (Python, DBSCAN & Gemini)

The Python service runs spatial clustering, Hungarian optimization, and AI summarization.

* **Path:** `services/algorithms/`
* **Virtual Environment:** `services/algorithms/venv/`
* **Installed Packages:** `numpy`, `scipy`, `scikit-learn`, `google-generativeai`, `pika`, `psycopg2-binary`, `python-dotenv`.

### Local Development Setup

To run the algorithmic worker natively, you need to create a Python virtual environment and install the dependencies:

```bash
cd services/algorithms
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

To start the background worker:
```bash
python3 src/worker.py
```
### Running Verification Tests:

1. **Test Streaming DBSCAN Clustering:**
   ```bash
   services/algorithms/venv/bin/python services/algorithms/src/clustering.py
   ```
   *Expected Output:* Correctly identifies reports within 100 meters as duplicate Cluster 0.

2. **Test Modified Hungarian Resource Allocation:**
   ```bash
   services/algorithms/venv/bin/python services/algorithms/src/allocation.py
   ```
   *Expected Output:* Assigns nearest units (`RESCUE-01`, `FIRE-01`) to closest incidents.

3. **Test AI Summarizer (Gemini Flash with Fallback):**
   ```bash
   services/algorithms/venv/bin/python services/algorithms/src/summarizer.py
   ```
   *Expected Output:* Produces a clean emergency briefing paragraph.

4. **Test Clustering, Allocation and AI Summarizer:**
   ```bash
   ./services/algorithms/venv/bin/python services/algorithms/tests/test_algorithms.py
   ```
   
---

## 6. Frontend Service (React Progressive Web App)

The Frontend Service provides the Citizen Intake Form and Dispatcher Dashboard.

* **Path:** `services/frontend/`
* **Installed Packages:** `react`, `react-dom`, `leaflet`, `socket.io-client`, `lucide-react`, `vite`.
* **Run Development Server:**
  ```bash
  cd services/frontend
  npm run dev
  ```
* **Access the UI:** Open `http://localhost:5173` in your web browser.

---

## 7. End-to-End Simulation Testing

Once the Ingestion Service runs on port 5000, test the system by simulating a disaster event:

1. **Dry-Run Inspection (no network traffic):**
   ```bash
   python3 scripts/simulate_disaster.py --count 3 --dry-run
   ```
2. **Live Influx Test (30 citizen reports sent in Tagoloan Poblacion):**
   ```bash
   python3 scripts/simulate_disaster.py --count 30 --delay 0.05
   ```
   The script measures throughput and logs response statuses in real time.