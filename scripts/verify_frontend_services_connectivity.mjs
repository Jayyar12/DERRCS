import { io } from '/home/althea/Documents/DERRCS/services/frontend/node_modules/socket.io-client/build/esm/index.js';

const FRONTEND_URL = 'http://localhost:5173';

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('================================================================');
  console.log(' DERRCS FRONTEND-TO-SERVICES FULL CONNECTIVITY & FLOW AUDIT');
  console.log(' Target Frontend URL: ' + FRONTEND_URL);
  console.log('================================================================\n');

  let passedSteps = 0;
  let totalSteps = 0;

  function recordStep(name, success, detail = '') {
    totalSteps++;
    if (success) {
      passedSteps++;
      log('✅', `Step ${totalSteps}: ${name} ${detail ? `(${detail})` : ''}`);
    } else {
      log('❌', `Step ${totalSteps}: ${name} - FAILED: ${detail}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. Vite Server Check
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${FRONTEND_URL}/`);
    const text = await res.text();
    recordStep(
      'Vite Dev Server Availability',
      res.ok && (text.includes('DERRCS') || text.includes('root') || text.includes('vite')),
      `Status ${res.status}`
    );
  } catch (err) {
    recordStep('Vite Dev Server Availability', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 2. Health check through Vite Proxy
  // -------------------------------------------------------------------------
  try {
    const resHealth = await fetch(`${FRONTEND_URL}/health`);
    recordStep(
      'API Proxy Connectivity (/health -> Express :5000)',
      resHealth.status === 200,
      `API returned ${resHealth.status}`
    );
  } catch (err) {
    recordStep('API Proxy Connectivity', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 3. Staff Authentication through Frontend Proxy
  // -------------------------------------------------------------------------
  let dispatcherToken = null;
  let responderToken = null;
  let responderUnitId = null;
  let adminToken = null;

  try {
    const res = await fetch(`${FRONTEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dispatcher_tagoloan', password: 'password123' })
    });
    const data = await res.json();
    if (data.success && data.data?.token) {
      dispatcherToken = data.data.token;
      recordStep('Dispatcher Login through Vite Proxy', true, `User: ${data.data.fullName} (${data.data.role})`);
    } else {
      recordStep('Dispatcher Login through Vite Proxy', false, JSON.stringify(data));
    }
  } catch (err) {
    recordStep('Dispatcher Login through Vite Proxy', false, err.message);
  }

  try {
    const res = await fetch(`${FRONTEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'fire_bravo', password: 'password123' })
    });
    const data = await res.json();
    if (data.success && data.data?.token) {
      responderToken = data.data.token;
      responderUnitId = data.data.unitId;
      recordStep('Responder Login through Vite Proxy', true, `User: ${data.data.fullName}, Unit: ${responderUnitId}`);
    } else {
      recordStep('Responder Login through Vite Proxy', false, JSON.stringify(data));
    }
  } catch (err) {
    recordStep('Responder Login through Vite Proxy', false, err.message);
  }

  try {
    const res = await fetch(`${FRONTEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    const data = await res.json();
    if (data.success && data.data?.token) {
      adminToken = data.data.token;
      recordStep('Admin Login through Vite Proxy', true, `User: ${data.data.fullName} (${data.data.role})`);
    } else {
      recordStep('Admin Login through Vite Proxy', false, JSON.stringify(data));
    }
  } catch (err) {
    recordStep('Admin Login through Vite Proxy', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 4. WebSocket (Socket.IO) through Vite Proxy
  // -------------------------------------------------------------------------
  let dispatcherSocketConnected = false;
  let responderSocketConnected = false;
  let receivedCandidateEvent = false;
  let receivedAssignmentAlert = false;
  let receivedRecommendationEvent = false;
  let dispatcherSocket = null;
  let responderSocket = null;

  if (dispatcherToken) {
    dispatcherSocket = io(FRONTEND_URL, {
      auth: { token: dispatcherToken },
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 5000
    });

    dispatcherSocket.on('connect', () => {
      dispatcherSocketConnected = true;
    });

    dispatcherSocket.on('dispatcher:candidate:new', (payload) => {
      receivedCandidateEvent = true;
      log('📡', `[Socket.IO Dispatcher] Received dispatcher:candidate:new event: candidateId=${payload?.candidateId}`);
    });

    dispatcherSocket.on('dispatcher:assignment:recommended', (payload) => {
      receivedRecommendationEvent = true;
      log('📡', `[Socket.IO Dispatcher] Received dispatcher:assignment:recommended: incidentId=${payload?.incidentId}, unit=${payload?.recommendedUnitId}`);
    });
  }

  if (responderToken) {
    responderSocket = io(FRONTEND_URL, {
      auth: { token: responderToken },
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 5000
    });

    responderSocket.on('connect', () => {
      responderSocketConnected = true;
    });

    responderSocket.on('unit:dispatch:alert', (payload) => {
      receivedAssignmentAlert = true;
      log('📡', `[Socket.IO Responder] Received unit:dispatch:alert: incidentId=${payload?.incidentId}, unit=${payload?.unitId}`);
    });
  }

  await sleep(1500);
  recordStep('Dispatcher WebSocket via Vite Proxy (/socket.io)', dispatcherSocketConnected, 'Joined dispatchers room');
  recordStep('Responder WebSocket via Vite Proxy (/socket.io)', responderSocketConnected, 'Joined unit room');

  // -------------------------------------------------------------------------
  // 5. Citizen Reports Intake with Photo (2 nearby reports to trigger DBSCAN min_samples=2)
  // -------------------------------------------------------------------------
  let photoUrl = null;
  const reportsSubmitted = [];
  const baseLat = 8.5385;
  const baseLng = 124.7533;

  for (let idx = 1; idx <= 2; idx++) {
    try {
      const formData = new FormData();
      formData.append('sessionId', `test-citizen-${idx}-${Date.now()}`);
      formData.append('emergencyType', 'Fire');
      formData.append('description', `Verified structural fire near Tagoloan Market - Report #${idx}`);
      const reportCoords = { latitude: baseLat + (idx * 0.0001), longitude: baseLng + (idx * 0.0001) };
      formData.append('emergencyCoordinates', JSON.stringify(reportCoords));
      formData.append('reporterCoordinates', JSON.stringify(reportCoords));
      formData.append('standardizedAnswers', JSON.stringify({ structureType: 'Commercial', peopleTrapped: 'No' }));

      if (idx === 1) {
        const dummyPng = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])], { type: 'image/png' });
        formData.append('photo', dummyPng, `fire-incident-${Date.now()}.png`);
      }

      const res = await fetch(`${FRONTEND_URL}/api/v1/reports`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.data?.reportId) {
        reportsSubmitted.push(data.data.reportId);
        if (data.data.photoUrl) photoUrl = data.data.photoUrl;
      }
    } catch (err) {
      console.error(`Report ${idx} error:`, err);
    }
  }

  recordStep('Citizen Reports Intake via Vite Proxy', reportsSubmitted.length === 2, `2 reports submitted: [${reportsSubmitted.join(', ')}]`);

  // -------------------------------------------------------------------------
  // 6. Photo Uploads Proxy Verification
  // -------------------------------------------------------------------------
  if (photoUrl) {
    try {
      const res = await fetch(`${FRONTEND_URL}${photoUrl}`);
      recordStep('Photo Upload Static Proxy (/uploads/...)', res.ok, `Status ${res.status}`);
    } catch (err) {
      recordStep('Photo Upload Static Proxy (/uploads/...)', false, err.message);
    }
  }

  // -------------------------------------------------------------------------
  // 7. Wait for RabbitMQ -> Python DBSCAN Clustering -> Candidate Event
  // -------------------------------------------------------------------------
  console.log('\n⏳ Awaiting RabbitMQ -> Python DBSCAN clustering pipeline (up to 8s)...');
  let candidateId = null;
  for (let i = 0; i < 16; i++) {
    await sleep(500);
    if (dispatcherToken) {
      const res = await fetch(`${FRONTEND_URL}/api/v1/candidates`, {
        headers: { Authorization: `Bearer ${dispatcherToken}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        candidateId = data.data[0].id;
        break;
      }
    }
  }

  recordStep(
    'RabbitMQ + Python DBSCAN Clustering to Candidate',
    candidateId !== null,
    `Candidate ID: ${candidateId}`
  );

  // -------------------------------------------------------------------------
  // 8. Dispatcher Confirms Candidate -> Creates Incident (Reported -> Validated)
  // -------------------------------------------------------------------------
  let incidentId = null;
  let incidentCode = null;
  if (candidateId && dispatcherToken) {
    try {
      const res = await fetch(`${FRONTEND_URL}/api/v1/candidates/${candidateId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dispatcherToken}` }
      });
      const data = await res.json();
      if (data.success && data.data?.incidentId) {
        incidentId = data.data.incidentId;
        incidentCode = data.data.incidentCode;
        recordStep('Dispatcher Confirms Candidate (Reported -> Validated)', true, `${incidentCode} (ID: ${incidentId})`);
      } else {
        recordStep('Dispatcher Confirms Candidate (Reported -> Validated)', false, JSON.stringify(data));
      }
    } catch (err) {
      recordStep('Dispatcher Confirms Candidate', false, err.message);
    }
  }

  // -------------------------------------------------------------------------
  // 9. Wait for RabbitMQ -> Python Hungarian Algorithm Unit Recommendation
  // -------------------------------------------------------------------------
  console.log('⏳ Awaiting RabbitMQ -> Python Hungarian Algorithm allocation (up to 6s)...');
  for (let i = 0; i < 12; i++) {
    if (receivedRecommendationEvent) break;
    await sleep(500);
  }
  recordStep(
    'Hungarian Algorithm Event Delivery (assignment.recommended)',
    receivedRecommendationEvent,
    'Received via Socket.IO room dispatchers'
  );

  // -------------------------------------------------------------------------
  // 10. Dispatcher Fetches Available Units & Assigns fire_bravo's Unit
  // -------------------------------------------------------------------------
  let assignedUnitId = responderUnitId;
  if (incidentId && dispatcherToken && assignedUnitId) {
    try {
      const assignRes = await fetch(`${FRONTEND_URL}/api/v1/incidents/${incidentId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dispatcherToken}`
        },
        body: JSON.stringify({
          responseUnitId: assignedUnitId,
          notes: 'Immediate fire suppression dispatch.'
        })
      });
      const assignData = await assignRes.json();
      recordStep('Dispatcher Assigns Unit (Validated -> Dispatched)', assignData.success, `Unit ID: ${assignedUnitId}`);
    } catch (err) {
      recordStep('Dispatcher Assigns Unit', false, err.message);
    }
  }

  // Wait for unit dispatch alert
  console.log('⏳ Awaiting unit:dispatch:alert event...');
  for (let i = 0; i < 6; i++) {
    if (receivedAssignmentAlert) break;
    await sleep(500);
  }
  recordStep('Unit Dispatch Alert Event (unit:dispatch:alert)', receivedAssignmentAlert, 'Received by responder socket');

  // -------------------------------------------------------------------------
  // 11. Responder Portal: Fetch Current Assignment & Advance Status
  // -------------------------------------------------------------------------
  let currentAssignmentId = null;
  if (responderToken) {
    try {
      const res = await fetch(`${FRONTEND_URL}/api/v1/assignments/current`, {
        headers: { Authorization: `Bearer ${responderToken}` }
      });
      const data = await res.json();
      if (data.success && data.data?.assignment_id) {
        currentAssignmentId = data.data.assignment_id;
        recordStep('Responder Portal Current Assignment', true, `Assignment: ${currentAssignmentId}, Incident: ${data.data.incident_code}`);
      } else {
        recordStep('Responder Portal Current Assignment', false, JSON.stringify(data));
      }
    } catch (err) {
      recordStep('Responder Portal Current Assignment', false, err.message);
    }
  }

  // Responder EnRoute
  if (currentAssignmentId && responderToken) {
    try {
      const res = await fetch(`${FRONTEND_URL}/api/v1/assignments/${currentAssignmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${responderToken}`
        },
        body: JSON.stringify({ status: 'EnRoute' })
      });
      const data = await res.json();
      recordStep('Responder Marks Assignment EnRoute', data.success, data.success ? 'EnRoute recorded' : JSON.stringify(data));
    } catch (err) {
      recordStep('Responder Marks Assignment EnRoute', false, err.message);
    }
  }

  // Responder OnScene -> Incident Active
  if (currentAssignmentId && responderToken) {
    try {
      const res = await fetch(`${FRONTEND_URL}/api/v1/assignments/${currentAssignmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${responderToken}`
        },
        body: JSON.stringify({ status: 'OnScene' })
      });
      const data = await res.json();
      recordStep(
        'Responder Marks Assignment OnScene (Dispatched -> Active)',
        data.success,
        data.success ? 'Incident status is now Active' : JSON.stringify(data)
      );
    } catch (err) {
      recordStep('Responder Marks Assignment OnScene', false, err.message);
    }
  }

  // -------------------------------------------------------------------------
  // 12. Responder Submits Field Assessment -> Incident Resolved
  // -------------------------------------------------------------------------
  if (incidentId && responderToken && currentAssignmentId) {
    try {
      const res = await fetch(`${FRONTEND_URL}/api/v1/incidents/${incidentId}/field-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${responderToken}`
        },
        body: JSON.stringify({
          assignmentId: currentAssignmentId,
          patientName: 'Jane Doe',
          approximateAge: 32,
          gender: 'Female',
          consciousnessLevel: 'Alert',
          injuriesObserved: ['Laceration', 'Burn'],
          interventionsRendered: ['Wound dressing'],
          disposition: 'TreatedOnScene',
          destinationFacility: null,
          notes: 'Minor burn treated on scene. Fire contained.'
        })
      });
      const data = await res.json();
      recordStep(
        'Responder Submits Field Assessment (Active -> Resolved)',
        data.success,
        data.success ? 'Incident resolved & unit released' : JSON.stringify(data)
      );
    } catch (err) {
      recordStep('Responder Submits Field Assessment', false, err.message);
    }
  }

  // -------------------------------------------------------------------------
  // 13. Wait for Python Summarizer -> HandoverDebrief Generation
  // -------------------------------------------------------------------------
  console.log('⏳ Awaiting RabbitMQ -> Python Gemini Summarizer debrief generation (up to 8s)...');
  let handoverGenerated = false;
  for (let i = 0; i < 16; i++) {
    await sleep(500);
    if (incidentId && dispatcherToken) {
      const res = await fetch(`${FRONTEND_URL}/api/v1/incidents/${incidentId}`, {
        headers: { Authorization: `Bearer ${dispatcherToken}` }
      });
      const data = await res.json();
      if (data.success && data.data?.handover_summary) {
        handoverGenerated = true;
        log('📝', `Handover Summary: "${data.data.handover_summary.slice(0, 70)}..."`);
        break;
      }
    }
  }
  recordStep(
    'Python Summarizer Generation (HandoverDebrief in PostgreSQL)',
    handoverGenerated,
    'Saved to summaries table'
  );

  // -------------------------------------------------------------------------
  // 14. Dispatcher Closes Incident (Resolved -> Closed)
  // -------------------------------------------------------------------------
  if (incidentId && dispatcherToken) {
    try {
      const res = await fetch(`${FRONTEND_URL}/api/v1/incidents/${incidentId}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dispatcherToken}` }
      });
      const data = await res.json();
      recordStep('Dispatcher Closes Incident (Resolved -> Closed)', data.success, data.success ? 'Closed recorded' : JSON.stringify(data));
    } catch (err) {
      recordStep('Dispatcher Closes Incident', false, err.message);
    }
  }

  // -------------------------------------------------------------------------
  // 15. Admin Dashboard Endpoints through Vite Proxy
  // -------------------------------------------------------------------------
  if (adminToken) {
    try {
      const [usersRes, logsRes, configRes] = await Promise.all([
        fetch(`${FRONTEND_URL}/api/v1/admin/users`, { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch(`${FRONTEND_URL}/api/v1/admin/audit-logs`, { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch(`${FRONTEND_URL}/api/v1/admin/config`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      ]);
      const usersData = await usersRes.json();
      const logsData = await logsRes.json();
      const configData = await configRes.json();

      const allAdminOk = usersData.success && logsData.success && configData.success;
      recordStep(
        'Admin Dashboard Endpoints (/admin/users, /audit-logs, /config)',
        allAdminOk,
        `Users: ${usersData.data?.length}, Audit Logs: ${logsData.data?.length}`
      );
    } catch (err) {
      recordStep('Admin Dashboard Endpoints', false, err.message);
    }
  }

  // Clean up sockets
  dispatcherSocket?.disconnect();
  responderSocket?.disconnect();

  console.log('\n================================================================');
  console.log(` AUDIT RESULT: ${passedSteps} / ${totalSteps} Steps Passed`);
  console.log('================================================================');

  process.exit(passedSteps === totalSteps ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
