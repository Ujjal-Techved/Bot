import json
import os
import pyodbc
FILE = "data.json"

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
    if not os.path.exists(FILE):
        return []
    try:
        with open(FILE, "r") as f:
            content = f.read().strip()
            if not content:
                return []
            return json.loads(content)
    except json.JSONDecodeError:
        print("Warning: JSON file is empty or malformed. Returning empty list.")
        return []

def save_query(question, sql):
    queries = load_queries()
    queries.append({"question": question, "sql": sql})
    with open(FILE, "w") as f:
        json.dump(queries, f, indent=2)
