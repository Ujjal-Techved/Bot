import json
import os
import pyodbc
QUERIES_FILE = "data.json"
from nlp import is_similar

def get_connection():
    return pyodbc.connect(
        "DRIVER={SQL Server};"
        "SERVER=103.20.215.58;"
        "DATABASE=parivarthan_shivtech;"
        "UID=parivarthan_shivtech;"
        "PWD=Pzwg66$74"
    )

def run_query(sql):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql)
        columns = [column[0] for column in cursor.description]
        rows = cursor.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        return {"error": str(e)}
    finally:
        cursor.close()
        conn.close()


def load_queries():
    """Load previously saved queries from file."""
    if not os.path.exists(QUERIES_FILE):
        return []
    with open(QUERIES_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []  # Return empty if file is corrupted

def save_query(question, sql, intent=None, params=None):
    """
    Save a new query mapping if it doesn't already exist.
    Stores intent and optional params.
    """
    queries = load_queries()

    # Prevent duplicates
    for entry in queries:
        if is_similar(question, entry["question"]):
            return False  # Already exists

    new_entry = {
        "question": question,
        "sql": sql,
        "intent": intent if intent else None,
        "params": params if params else {}
    }

    queries.append(new_entry)

    with open(QUERIES_FILE, "w", encoding="utf-8") as f:
        json.dump(queries, f, indent=2, ensure_ascii=False)

    return True
