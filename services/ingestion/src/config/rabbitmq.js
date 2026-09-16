/**
 * DERRCS RabbitMQ Message Broker Configuration
 * Manages connection to RabbitMQ, asserts the topic exchange, and provides
 * a publish helper for domain events across the ingestion service.
 *
 * Exchange: derrcs.events (topic)
 * Routing keys: report.ingested, incident.validated, field.assessment.submitted,
 *               candidate.created, candidate.updated, assignment.recommended
 */

const amqp = require('amqplib');

const EXCHANGE_NAME = 'derrcs.events';
const EXCHANGE_TYPE = 'topic';

let connection = null;
let channel = null;

/**
 * Connects to RabbitMQ and asserts the topic exchange.
 * Retries up to 5 times with exponential backoff if broker is not ready.
 */
async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL
    || `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || 5672}`;

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      connection = await amqp.connect(url);
      channel = await connection.createChannel();

      // Assert durable topic exchange for all DERRCS domain events
      await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });

      console.log(`[RabbitMQ] Connected. Exchange "${EXCHANGE_NAME}" asserted.`);

      // Handle unexpected disconnects
      connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error:', err.message);
      });

      connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed. Will attempt reconnect on next publish.');
        channel = null;
        connection = null;
      });

      return channel;
    } catch (err) {
      attempt++;
      const delay = Math.min(1000 * Math.pow(2, attempt), 16000);
      console.warn(`[RabbitMQ] Connection attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error('[RabbitMQ] Failed to connect after all retries. Events will not be published.');
  return null;
}

/**
 * Publishes a domain event to the derrcs.events topic exchange.
 * @param {string} routingKey - The event routing key (e.g. "report.ingested").
 * @param {object} payload - The event payload to serialize as JSON.
 */
async function publishEvent(routingKey, payload) {
  try {
    if (!channel) {
      console.warn(`[RabbitMQ] No channel available. Attempting reconnect before publishing ${routingKey}...`);
      await connectRabbitMQ();
    }

    if (!channel) {
      console.error(`[RabbitMQ] Cannot publish ${routingKey}: no channel after reconnect attempt.`);
      return false;
    }

    const message = Buffer.from(JSON.stringify(payload));
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      contentType: 'application/json',
      persistent: true,
      timestamp: Math.floor(Date.now() / 1000)
    });

    console.log(`[RabbitMQ] Published ${routingKey}: ${payload.id || payload.reportId || payload.incidentId || 'event'}`);
    return true;
  } catch (err) {
    console.error(`[RabbitMQ] Failed to publish ${routingKey}:`, err.message);
    return false;
  }
}

/**
 * Gracefully closes the RabbitMQ connection.
 */
async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('[RabbitMQ] Connection closed gracefully.');
  } catch (err) {
    console.error('[RabbitMQ] Error closing connection:', err.message);
  }
}

module.exports = {
  connectRabbitMQ,
  publishEvent,
  closeRabbitMQ,
  EXCHANGE_NAME
};
