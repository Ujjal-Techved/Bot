import os
import pandas as pd
import logging
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from db import run_query
from document_utils import load_documents_from_directory, split_text, chroma_client, ollama_ef, collection_name


logger = logging.getLogger(__name__)

def update_documents_from_db():
    try:
        logger.info("Starting document update from DB...")

        # 1. Always overwrite CSV
        csv_path = "./new_data/db_dump.csv"

        sql = "SELECT * FROM ProjectRequest;"  # <-- replace with your actual table
        rows = run_query(sql)

        if rows:
            df = pd.DataFrame(rows)
            df.to_csv(csv_path, index=False)

        # 2. Reload into ChromaDB
        documents = load_documents_from_directory("./new_data")

        chunked_documents = []
        for doc in documents:
            chunks = split_text(doc["text"])
            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc['id']}_chunk{i+1}"
                chunked_documents.append({"id": chunk_id, "text": chunk})

        # Clear and rebuild collection
        try:
            chroma_client.delete_collection(collection_name)
        except Exception:
            pass
        global collection
        new_collection = chroma_client.get_or_create_collection(
            name=collection_name,
            embedding_function=ollama_ef
        )

        for doc in chunked_documents:
            new_collection.upsert(ids=[doc["id"]], documents=[doc["text"]])

        logger.info("✅ Document update complete")

    except Exception as e:
        logger.exception("❌ Error while updating documents: %s", e)


def start_scheduler():
    scheduler = BackgroundScheduler(timezone=pytz.timezone("Asia/Kolkata"))
    scheduler.add_job(update_documents_from_db, IntervalTrigger(minutes=5))
    #scheduler.add_job(update_documents_from_db, CronTrigger(hour=11, minute=47))   # 9 AM
    #scheduler.add_job(update_documents_from_db, CronTrigger(hour=15, minute=0))  # 3 PM
    scheduler.start()

    import atexit
    atexit.register(lambda: scheduler.shutdown())
