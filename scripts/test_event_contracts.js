require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const amqp = require('amqplib');
const { io: ioClient } = require('socket.io-client');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const dispToken = jwt.sign({ userId: '22222222-2222-2222-2222-222222222222', username: 'dispatcher_tagoloan', role: 'Dispatcher' }, SECRET);
const unitId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const unitToken = jwt.sign({ userId: '33333333-3333-3333-3333-333333333333', username: 'rescue_alpha', role: 'ResponseUnit', unitId }, SECRET);

async function runTest() {
  const dispSocket = ioClient('http://localhost:5000', { auth: { token: dispToken }, transports: ['websocket'] });
  const unitSocket = ioClient('http://localhost:5000', { auth: { token: unitToken }, transports: ['websocket'] });

  dispSocket.on('connect_error', (err) => console.error('Dispatcher socket connect_error:', err.message));
  unitSocket.on('connect_error', (err) => console.error('Unit socket connect_error:', err.message));

  await Promise.all([
    new Promise((resolve, reject) => {
      dispSocket.on('connect', resolve);
      dispSocket.on('connect_error', reject);
    }),
    new Promise((resolve, reject) => {
      unitSocket.on('connect', resolve);
      unitSocket.on('connect_error', reject);
    })
  ]);

  console.log('✅ Both sockets connected.');

  let receivedCandidate = false;
  let receivedUnitAlert = false;
  let receivedFieldResolved = false;

  dispSocket.on('dispatcher:candidate:new', (data) => {
    console.log('✅ PASS 1: dispatcher:candidate:new received for candidateId:', data.candidateId);
    receivedCandidate = true;
  });

  unitSocket.on('unit:dispatch:alert', (data) => {
    console.log('✅ PASS 2: unit:dispatch:alert received for unitId:', data.unitId);
    receivedUnitAlert = true;
  });

  dispSocket.on('dispatcher:field:resolved', (data) => {
    console.log('✅ PASS 3: dispatcher:field:resolved received for assessmentId:', data.assessmentId);
    receivedFieldResolved = true;
  });

  const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://derrcs_rabbit:your_secure_rabbit_password@localhost:5672');
  const ch = await conn.createChannel();

  const crypto = require('crypto');
  // Test 1: candidate.created
  ch.publish('derrcs.events', 'candidate.created', Buffer.from(JSON.stringify({
    candidateId: crypto.randomUUID(),
    emergencyType: 'Fire'
  })));

  // Test 2: unit.assigned
  ch.publish('derrcs.events', 'unit.assigned', Buffer.from(JSON.stringify({
    unitId: unitId,
    incidentId: crypto.randomUUID()
  })));

  // Test 3: field.assessment.submitted
  ch.publish('derrcs.events', 'field.assessment.submitted', Buffer.from(JSON.stringify({
    assessmentId: crypto.randomUUID(),
    incidentId: crypto.randomUUID()
  })));

  setTimeout(async () => {
    dispSocket.disconnect();
    unitSocket.disconnect();
    await ch.close();
    await conn.close();
    if (receivedCandidate && receivedUnitAlert && receivedFieldResolved) {
      console.log('\n🎉 ALL THREE EVENT CONTRACT TESTS PASSED!');
      process.exit(0);
    } else {
      console.error('\n❌ FAILED - Missing events:', { receivedCandidate, receivedUnitAlert, receivedFieldResolved });
      process.exit(1);
    }
  }, 1000);
}

runTest().catch((err) => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
