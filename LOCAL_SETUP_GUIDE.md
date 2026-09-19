# DERRCS — Local Development Setup Guide (Linux & Windows)

This guide provides end-to-end setup instructions for running the **Digital Emergency Reporting and Response Coordination System (DERRCS)** natively on **Linux** (Ubuntu/Debian) and **Windows** (PowerShell) without Docker.

---

## 1. System Requirements & Prerequisites

Ensure the following runtimes are installed before beginning:

| Component | Minimum Version | Linux Package / Verification | Windows Package / Verification |
|---|---|---|---|
| **Node.js** | `v20+` or `v22+` | `node -v` / `npm -v` | `winget install OpenJS.NodeJS.LTS` |
| **Python** | `3.11+` to `3.13` | `python3 --version` | `winget install Python.Python.3.12` |
| **PostgreSQL** | `15+` with **PostGIS** | `sudo apt install postgresql postgresql-postgis` | `winget install PostgreSQL.PostgreSQL.16` |
| **RabbitMQ** | `3.12+` | `sudo apt install rabbitmq-server` | `winget install RabbitMQ.RabbitMQ` |
| **Git** | `2.40+` | `git --version` | `winget install Git.Git` |

---

## 2. Environment Configuration (`.env`)

All services share a root `.env` configuration.

### 2.1 Create Local `.env`

Copy the template file:

- **Linux (Bash):**
  ```bash
  cp .env.example .env
  ```
- **Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```

### 2.2 Configure Native Hosts and Credentials

Edit `.env` and configure the following parameters. When running natively outside Docker, hosts **must** point to `localhost`:

```env
# 1. APPLICATION ENVIRONMENT
NODE_ENV=development
API_PORT=5000
PYTHON_PORT=8000
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=8h

# 2. POSTGRESQL WITH POSTGIS (Local Native)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=derrcs_db
POSTGRES_USER=derrcs_user
POSTGRES_PASSWORD=your_secure_postgres_password
DATABASE_URL=postgresql://derrcs_user:your_secure_postgres_password@localhost:5432/derrcs_db

# 3. RABBITMQ MESSAGE BROKER (Local Native)
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_MGMT_PORT=15672
RABBITMQ_DEFAULT_USER=derrcs_rabbit
RABBITMQ_DEFAULT_PASS=your_secure_rabbit_password
RABBITMQ_URL=amqp://derrcs_rabbit:your_secure_rabbit_password@localhost:5672

# 4. ARTIFICIAL INTELLIGENCE (GOOGLE GEMINI API)
GEMINI_API_KEY=your_actual_gemini_api_key

# 5. ALGORITHM THRESHOLD PARAMETERS
DBSCAN_EPSILON_METERS=100
DBSCAN_MIN_POINTS=2
CLUSTER_TIME_WINDOW_HOURS=12
REPORT_RATE_LIMIT_PER_MINUTE=10

# 6. LOCAL MEDIA STORAGE PATH
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=5
```

> [!IMPORTANT]
> The database and RabbitMQ passwords in `.env` **must match exactly** the credentials created in Section 3 and Section 4.

---

## 3. Database Initialization (PostgreSQL + PostGIS)

### 3.1 Linux (Ubuntu/Debian)

1. **Install PostgreSQL and PostGIS:**
   ```bash
   sudo apt update
   sudo apt install -y postgresql postgresql-postgis
   ```

2. **Create User, Database, and Enable Extension:**
   ```bash
   sudo -u postgres psql -c "CREATE USER derrcs_user WITH PASSWORD 'your_secure_postgres_password';"
   sudo -u postgres psql -c "CREATE DATABASE derrcs_db OWNER derrcs_user;"
   sudo -u postgres psql -d derrcs_db -c "CREATE EXTENSION IF NOT EXISTS postgis;"
   ```

3. **Apply Baseline Schema, Seeds, and Migrations:**
   ```bash
   PGPASSWORD='your_secure_postgres_password' psql -U derrcs_user -d derrcs_db -h localhost -f database-schema.sql
   PGPASSWORD='your_secure_postgres_password' psql -U derrcs_user -d derrcs_db -h localhost -f seeds/02-initial-seeds.sql
   PGPASSWORD='your_secure_postgres_password' psql -U derrcs_user -d derrcs_db -h localhost -f migrations/003_phase3_state_machine_escalation.sql
   ```

### 3.2 Windows (PowerShell)

1. **Install PostgreSQL and PostGIS:**
   - Install PostgreSQL via `winget install PostgreSQL.PostgreSQL.16` or from the official installer.
   - Run the **Application Stack Builder** at the end of the installer to install the **PostGIS** bundle under Spatial Extensions.

2. **Create User, Database, and Enable Extension:**
   Open PowerShell as Administrator:
   ```powershell
   psql -U postgres -h localhost -c "CREATE USER derrcs_user WITH PASSWORD 'your_secure_postgres_password';"
   psql -U postgres -h localhost -c "CREATE DATABASE derrcs_db OWNER derrcs_user;"
   psql -U postgres -h localhost -d derrcs_db -c "CREATE EXTENSION IF NOT EXISTS postgis;"
   ```

3. **Apply Baseline Schema, Seeds, and Migrations:**
   ```powershell
   $env:PGPASSWORD = "your_secure_postgres_password"
   psql -U derrcs_user -d derrcs_db -h localhost -f database-schema.sql
   psql -U derrcs_user -d derrcs_db -h localhost -f seeds/02-initial-seeds.sql
   psql -U derrcs_user -d derrcs_db -h localhost -f migrations/003_phase3_state_machine_escalation.sql
   ```

---

## 4. Message Broker Initialization (RabbitMQ)

### 4.1 Linux (Ubuntu/Debian)

1. **Install and Start RabbitMQ:**
   ```bash
   sudo apt install -y rabbitmq-server
   sudo systemctl enable --now rabbitmq-server
   ```

2. **Enable Web Management Plugin:**
   ```bash
   sudo rabbitmq-plugins enable rabbitmq_management
   ```

3. **Create User and Assign Permissions:**
   ```bash
   sudo rabbitmqctl add_user derrcs_rabbit your_secure_rabbit_password
   sudo rabbitmqctl set_user_tags derrcs_rabbit administrator
   sudo rabbitmqctl set_permissions -p / derrcs_rabbit ".*" ".*" ".*"
   ```

4. **Verify Management UI:**
   Open `http://localhost:15672` in your browser and log in with `derrcs_rabbit`.

### 4.2 Windows (PowerShell)

1. **Install Erlang & RabbitMQ:**
   ```powershell
   winget install Erlang.Erlang
   winget install RabbitMQ.RabbitMQ
   ```

2. **Navigate to RabbitMQ sbin directory:**
   ```powershell
   cd "C:\Program Files\RabbitMQ Server\rabbitmq_server-*\sbin"
   ```

3. **Enable Web Management Plugin:**
   ```powershell
   .\rabbitmq-plugins.bat enable rabbitmq_management
   ```

4. **Create User and Assign Permissions:**
   ```powershell
   .\rabbitmqctl.bat add_user derrcs_rabbit your_secure_rabbit_password
   .\rabbitmqctl.bat set_user_tags derrcs_rabbit administrator
   .\rabbitmqctl.bat set_permissions -p / derrcs_rabbit ".*" ".*" ".*"
   ```

---

## 5. Microservices Dependency Installation

Install all package dependencies across each service directory.

### 5.1 Root Dependencies
- **Linux / Windows:**
  ```bash
  npm install
  ```

### 5.2 Ingestion Service (Node.js & Express)
- **Linux / Windows:**
  ```bash
  cd services/ingestion
  npm install
  cd ../..
  ```

### 5.3 React Frontend Service (Vite)
- **Linux / Windows:**
  ```bash
  cd services/frontend
  npm install
  cd ../..
  ```

### 5.4 Algorithmic Service (Python Virtual Environment)

#### Linux:
```bash
cd services/algorithms
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ../..
```

#### Windows (PowerShell):
```powershell
cd services\algorithms
python -m venv venv

# If script execution is restricted, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..\..
```

---

## 6. Verification and Test Suite

Execute the built-in tests to ensure algorithms and build toolchains are functional before starting the services.

### 6.1 Algorithm Unit & Integration Tests (12 Test Cases)
- **Linux:**
  ```bash
  services/algorithms/venv/bin/python services/algorithms/tests/test_algorithms.py
  ```
- **Windows (PowerShell):**
  ```powershell
  .\services\algorithms\venv\Scripts\python.exe services\algorithms\tests\test_algorithms.py
  ```

### 6.2 Standalone Algorithm Tests
- **Streaming DBSCAN Duplicate Detection:**
  ```bash
  # Linux:
  services/algorithms/venv/bin/python services/algorithms/src/clustering.py
  # Windows:
  .\services\algorithms\venv\Scripts\python.exe services\algorithms\src\clustering.py
  ```
- **Modified Hungarian Resource Allocation:**
  ```bash
  # Linux:
  services/algorithms/venv/bin/python services/algorithms/src/allocation.py
  # Windows:
  .\services\algorithms\venv\Scripts\python.exe services\algorithms\src\allocation.py
  ```
- **AI Briefing Summarizer (Gemini Flash with Fallback):**
  ```bash
  # Linux:
  services/algorithms/venv/bin/python services/algorithms/src/summarizer.py
  # Windows:
  .\services\algorithms\venv\Scripts\python.exe services\algorithms\src\summarizer.py
  ```

### 6.3 Frontend Production Build Verification
- **Linux / Windows:**
  ```bash
  cd services/frontend
  npm run build
  cd ../..
  ```

### 6.4 Disaster Load Simulator Dry-Run
- **Linux / Windows:**
  ```bash
  python scripts/simulate_disaster.py --count 3 --dry-run
  ```

---

## 7. Running the System (3 Terminals)

Start the three core microservices in separate terminals:

### Terminal 1: Ingestion API Service
- **Linux / Windows:**
  ```bash
  cd services/ingestion
  npm run dev
  ```
- **Health Check:** Open `http://localhost:5000/health` in your browser. Expected response:
  ```json
  {"status":"healthy","service":"derrcs-ingestion-service"}
  ```

### Terminal 2: Algorithmic Background Worker
- **Linux:**
  ```bash
  cd services/algorithms
  venv/bin/python src/worker.py
  ```
- **Windows (PowerShell):**
  ```powershell
  cd services\algorithms
  .\venv\Scripts\python.exe src\worker.py
  ```

### Terminal 3: React Frontend Dashboard
- **Linux / Windows:**
  ```bash
  cd services/frontend
  npm run dev
  ```
- **Dashboard UI:** Open `http://localhost:5173` in your browser.

---

## 8. Troubleshooting & Common Issues

### Issue 1: `password authentication failed for user "derrcs_user"`
* **Cause:** The password assigned to `derrcs_user` in PostgreSQL does not match `POSTGRES_PASSWORD` in `.env`.
* **Fix (Linux):**
  ```bash
  sudo -u postgres psql -c "ALTER USER derrcs_user WITH PASSWORD 'your_secure_postgres_password';"
  ```
* **Fix (Windows):**
  ```powershell
  psql -U postgres -h localhost -c "ALTER USER derrcs_user WITH PASSWORD 'your_secure_postgres_password';"
  ```

---

### Issue 2: `Error: listen EADDRINUSE: address already in use :::5000`
* **Cause:** An earlier Node/nodemon instance is still holding port `5000`.
* **Fix (Linux):**
  ```bash
  # Find PID listening on port 5000:
  lsof -i :5000
  # Terminate process:
  kill -9 <PID>
  ```
* **Fix (Windows PowerShell):**
  ```powershell
  # Find PID listening on port 5000:
  Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
  # Terminate process:
  Stop-Process -Id <PID> -Force
  ```

---

### Issue 3: `ERROR: extension "postgis" is not available`
* **Cause:** The PostGIS package was not installed alongside PostgreSQL.
* **Fix (Linux):**
  ```bash
  sudo apt install -y postgresql-postgis
  sudo systemctl restart postgresql
  ```
* **Fix (Windows):** Run PostgreSQL Application Stack Builder and select **PostGIS Bundle**.

---

### Issue 4: PowerShell `Activate.ps1 cannot be loaded because running scripts is disabled`
* **Cause:** Windows PowerShell execution policy blocks unsigned script execution by default.
* **Fix (Windows PowerShell):**
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

---

### Issue 5: `FATAL: Peer authentication failed for user "derrcs_user"`
* **Cause:** Running `psql` without specifying `-h localhost` defaults to UNIX domain socket (`/var/run/postgresql/.s.PGSQL.5432`), which uses `peer` authentication (requiring your operating system username to match the database user).
* **Fix:** Always supply `-h localhost` to force loopback TCP connection with password authentication:
  ```bash
  PGPASSWORD='your_secure_postgres_password' psql -h localhost -U derrcs_user -d derrcs_db -f <file.sql>
  ```

---

### Issue 6: Default Test Accounts Reference

When testing authentication against `http://localhost:5000/api/v1/auth/login`:

| Role | Username | Default Password | Description |
|---|---|---|---|
| **Admin** | `admin` | `password123` | System Administrator |
| **Dispatcher** | `dispatcher_tagoloan` | `password123` | MDRRMO Operations Dispatcher |
| **ResponseUnit** | `rescue_alpha` | `password123` | Rescue Alpha (`RESCUE-01`) |
| **ResponseUnit** | `fire_bravo` | `password123` | BFP Engine 1 (`FIRE-ENGINE-01`) |
