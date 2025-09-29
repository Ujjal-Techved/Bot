import pyodbc
import pandas as pd
import os

# Database connection settings
SERVER = "TVDDT006"
DATABASE = "ParivartanDB"

# Output folder for CSV files
OUTPUT_DIR = "db_export"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_connection():
    return pyodbc.connect(
        f"DRIVER={{SQL Server}};"
        f"SERVER={SERVER};"
        f"DATABASE={DATABASE};"
        "Trusted_Connection=yes;"
        "TrustServerCertificate=yes;"
        "Connection Timeout=30;"
    )

def export_database_to_csv():
    conn = get_connection()
    cursor = conn.cursor()

    # Get list of all tables
    cursor.execute("""
        SELECT TABLE_SCHEMA, TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
    """)
    tables = cursor.fetchall()

    for schema, table in tables:
        table_name = f"{schema}.{table}"
        print(f"Exporting {table_name}...")

        # Fetch all data
        df = pd.read_sql(f"SELECT * FROM {table_name}", conn)

        # Save to CSV
        csv_file = os.path.join(OUTPUT_DIR, f"{schema}_{table}.csv")
        df.to_csv(csv_file, index=False, encoding="utf-8-sig")

    cursor.close()
    conn.close()
    print(f"Export completed. Files are saved in: {OUTPUT_DIR}")

if __name__ == "__main__":
    export_database_to_csv()
