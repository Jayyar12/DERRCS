"""
DERRCS RabbitMQ Worker Service
Consumes domain events from the derrcs.events topic exchange and routes them
to the appropriate algorithmic handler (clustering, allocation, summarization).

Usage: python worker.py
"""

import os
import sys
import json
import time
import pika
from dotenv import load_dotenv

# Load environment before local imports
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))

from clustering import handle_report_ingested
from allocation import handle_incident_validated
from summarizer import handle_candidate_created, handle_field_assessment_submitted

EXCHANGE_NAME = 'derrcs.events'

# Queue definitions: each queue binds to one or more routing keys
QUEUE_BINDINGS = {
    'derrcs.clustering': ['report.ingested'],
    'derrcs.allocation': ['incident.validated'],
    'derrcs.summarizer': ['candidate.created', 'field.assessment.submitted'],
}

# Route each routing key to its handler function
HANDLERS = {
    'report.ingested': handle_report_ingested,
    'incident.validated': handle_incident_validated,
    'candidate.created': handle_candidate_created,
    'field.assessment.submitted': handle_field_assessment_submitted,
}


def get_rabbitmq_connection():
    """Creates a blocking connection to RabbitMQ with retry logic."""
    host = os.getenv('RABBITMQ_HOST', 'localhost')
    port = int(os.getenv('RABBITMQ_PORT', 5672))
    user = os.getenv('RABBITMQ_DEFAULT_USER', 'derrcs_rabbit')
    password = os.getenv('RABBITMQ_DEFAULT_PASS', 'rabbit_password_2026')

    credentials = pika.PlainCredentials(user, password)
    params = pika.ConnectionParameters(
        host=host,
        port=port,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300,
    )

    max_retries = 10
    for attempt in range(1, max_retries + 1):
        try:
            connection = pika.BlockingConnection(params)
            print(f"[Worker] Connected to RabbitMQ at {host}:{port}")
            return connection
        except pika.exceptions.AMQPConnectionError as e:
            delay = min(2 ** attempt, 30)
            print(f"[Worker] RabbitMQ connection attempt {attempt}/{max_retries} failed: {e}. Retrying in {delay}s...")
            time.sleep(delay)

    print("[Worker] Failed to connect to RabbitMQ after all retries. Exiting.")
    sys.exit(1)


def publish_event(channel, routing_key, payload):
    """Publishes an event back to the derrcs.events exchange."""
    try:
        channel.basic_publish(
            exchange=EXCHANGE_NAME,
            routing_key=routing_key,
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                content_type='application/json',
                delivery_mode=2,  # persistent
            )
        )
        print(f"[Worker] Published {routing_key}")
    except Exception as e:
        print(f"[Worker] Failed to publish {routing_key}: {e}")


def on_message(channel, method, properties, body):
    """Generic message callback that routes to the correct handler."""
    routing_key = method.routing_key
    handler = HANDLERS.get(routing_key)

    if not handler:
        print(f"[Worker] No handler for routing key: {routing_key}. Acknowledging and skipping.")
        channel.basic_ack(delivery_tag=method.delivery_tag)
        return

    try:
        payload = json.loads(body)
        print(f"[Worker] Received {routing_key}: {json.dumps(payload, default=str)[:200]}")

        # Every handler receives the payload and a publish callback
        handler(payload, lambda rk, p: publish_event(channel, rk, p))

        channel.basic_ack(delivery_tag=method.delivery_tag)
        print(f"[Worker] Processed {routing_key} successfully.")
    except json.JSONDecodeError as e:
        print(f"[Worker] Invalid JSON in {routing_key}: {e}. Rejecting message.")
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    except Exception as e:
        print(f"[Worker] Error processing {routing_key}: {e}.")
        if method.redelivered:
            print(f"[Worker] Message {routing_key} failed after redelivery. Rejecting without requeue.")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        else:
            print(f"[Worker] Transient error processing {routing_key}. Requeuing once.")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


def main():
    """Initializes queues, binds routing keys, and starts consuming."""
    print("=" * 60)
    print("DERRCS Algorithmic Worker Service")
    print(f"Exchange: {EXCHANGE_NAME}")
    print(f"Queues: {', '.join(QUEUE_BINDINGS.keys())}")
    print("=" * 60)

    connection = get_rabbitmq_connection()
    channel = connection.channel()

    # Assert the exchange (idempotent, matches Node.js assertion)
    channel.exchange_declare(
        exchange=EXCHANGE_NAME,
        exchange_type='topic',
        durable=True
    )

    # Declare queues and bind routing keys
    for queue_name, routing_keys in QUEUE_BINDINGS.items():
        channel.queue_declare(queue=queue_name, durable=True)
        for rk in routing_keys:
            channel.queue_bind(exchange=EXCHANGE_NAME, queue=queue_name, routing_key=rk)
            print(f"[Worker] Bound {queue_name} <- {rk}")

    # Fair dispatch: one message at a time per worker
    channel.basic_qos(prefetch_count=1)

    # Register consumer for each queue
    for queue_name in QUEUE_BINDINGS:
        channel.basic_consume(queue=queue_name, on_message_callback=on_message)

    print("[Worker] Waiting for messages. Press Ctrl+C to exit.")

    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        print("\n[Worker] Shutting down...")
        channel.stop_consuming()
    finally:
        connection.close()
        print("[Worker] Connection closed.")


if __name__ == '__main__':
    main()
