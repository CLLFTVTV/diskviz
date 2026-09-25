import os

DB_PATH = os.environ.get("DB_PATH", "./diskviz.db")
SCAN_BATCH_SIZE = 200
SCAN_FLUSH_INTERVAL = 0.1
HASH_CHUNK_SIZE = 65536
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
