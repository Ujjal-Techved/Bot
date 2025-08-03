from fastapi import FastAPI, Request
from pydantic import BaseModel
from llm_engine import generate_sql
#from llm_engine1 import generate_sql
from db import save_query, load_queries, run_query
from nlp import is_similar
import logging

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_sql_endpoint(query_input):
    try:
        question = query_input
        print("Generating SQL for question: %s", question)
        # Load existing queries
        existing_queries = load_queries()
        print("Existing queries: %s", existing_queries)
        # Check for similarity
        for entry in existing_queries:
            if is_similar(question, entry["question"]):
                sql = entry["sql"]
                raw_result = run_query(sql)
                # Handle both single-value and multi-row responses
                if not raw_result:
                    result_value = None
                elif len(raw_result) == 1 and len(raw_result[0]) == 1:
                    # Single row and single column — return just the value
                    result_value = list(raw_result[0].values())[0]
                else:
                    # Multiple rows or multiple columns — return full list
                    result_value = raw_result
                print("Query result: %s", result_value)
                return {"query": question, "sql": sql, "result": result_value}

        sql = generate_sql(question)
        # Save to local DB
        save_query(question, sql)
        raw_result  = run_query(sql)
        # Handle both single-value and multi-row responses
        if not raw_result:
            result_value = None
        elif len(raw_result) == 1 and len(raw_result[0]) == 1:
            # Single row and single column — return just the value
            result_value = list(raw_result[0].values())[0]
        else:
            # Multiple rows or multiple columns — return full list
            result_value = raw_result
        print("Query result: %s", result_value)
        return {"query": question, "sql": sql, "result": result_value}
    except Exception as e:
        print(e)
        return {"query": query_input, "error": str(e), "result": None}

generate_sql_endpoint("give me total number of Employee Comments")