'use strict';

// Test consumer routing logic in isolation
function simulateConsumer(msg, emitToRoom) {
  const payload = JSON.parse(msg.content.toString());
  const routingKey = msg.fields ? msg.fields.routingKey : '';
  const unitId = payload.unitId || payload.recommendedUnitId;

  if (routingKey === 'assignment.recommended') {
    // Algorithm recommended unit: notify dispatchers (advisory only)
    emitToRoom('dispatchers', 'dispatcher:assignment:recommended', payload);
  } else if (routingKey === 'unit.assigned') {
    if (unitId) {
      emitToRoom(`unit:${unitId}`, 'unit:dispatch:alert', payload);
    } else {
      console.warn('[Consumer] unit event missing unitId for direct alert:', payload);
    }
  }
}

function testRouting() {
  console.log('--- Testing RabbitMQ Consumer 2 Event Routing ---');
  let dispatchedToUnit = false;
  let recommendedToDispatcher = false;

  const mockEmit = (room, event, payload) => {
    if (event === 'unit:dispatch:alert') {
      dispatchedToUnit = true;
    }
    if (event === 'dispatcher:assignment:recommended') {
      recommendedToDispatcher = true;
    }
  };

  // Case 1: assignment.recommended
  simulateConsumer({
    fields: { routingKey: 'assignment.recommended' },
    content: Buffer.from(JSON.stringify({
      incidentId: 'inc-123',
      recommendedUnitId: 'unit-abc',
      estimatedTravelTimeMinutes: 3.5
    }))
  }, mockEmit);

  if (recommendedToDispatcher && !dispatchedToUnit) {
    console.log('✅ PASS: assignment.recommended only notified dispatchers, NO alert sent to unit.');
  } else {
    console.error('❌ FAIL: assignment.recommended prematurely alerted unit!');
    process.exit(1);
  }

  // Case 2: unit.assigned
  dispatchedToUnit = false;
  simulateConsumer({
    fields: { routingKey: 'unit.assigned' },
    content: Buffer.from(JSON.stringify({
      incidentId: 'inc-123',
      unitId: 'unit-abc'
    }))
  }, mockEmit);

  if (dispatchedToUnit) {
    console.log('✅ PASS: unit.assigned correctly sent alert to unit:unit-abc.');
  } else {
    console.error('❌ FAIL: unit.assigned failed to alert unit!');
    process.exit(1);
  }
}

testRouting();
