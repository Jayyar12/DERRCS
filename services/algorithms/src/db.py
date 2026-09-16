"""
DERRCS PostgreSQL Connection Helper for Python Worker
Provides a connection pool and query helper for the algorithms service.
Uses psycopg2 with parameters from .env.
"""

import os
import psycopg2
import psycopg2.pool
import psycopg2.extras
from dotenv import load_dotenv

# Load .env from the project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))


def get_connection_params():
    """Reads PostgreSQL connection parameters from environment variables."""
    return {
        'host': os.getenv('POSTGRES_HOST', 'localhost'),
        'port': int(os.getenv('POSTGRES_PORT', 5432)),
        'database': os.getenv('POSTGRES_DB', 'derrcs_db'),
        'user': os.getenv('POSTGRES_USER', 'derrcs_user'),
        'password': os.getenv('POSTGRES_PASSWORD', 'derrcs_password_2026'),
    }


# Module-level connection pool (lazy initialized)
_pool = None


def get_pool():
    """Returns a thread-safe connection pool, creating it on first call."""
    global _pool
    if _pool is None or _pool.closed:
        params = get_connection_params()
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=5,
            **params
        )
        print(f"[DB] Pool created: {params['host']}:{params['port']}/{params['database']}")
    return _pool


def get_connection():
    """Gets a connection from the pool. Caller must return it with put_connection()."""
    return get_pool().getconn()


def put_connection(conn):
    """Returns a connection back to the pool."""
    get_pool().putconn(conn)


def query(sql, params=None, fetch=True):
    """
    Executes a SQL query and returns results as a list of dicts.
    For INSERT/UPDATE, set fetch=False to skip result fetching.
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            conn.commit()
            if fetch and cur.description:
                return cur.fetchall()
            return []
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        put_connection(conn)


def query_one(sql, params=None):
    """Executes a SQL query and returns a single row as a dict, or None."""
    rows = query(sql, params)
    return rows[0] if rows else None


def close_pool():
    """Closes all connections in the pool."""
    global _pool
    if _pool and not _pool.closed:
        _pool.closeall()
        print("[DB] Pool closed.")
