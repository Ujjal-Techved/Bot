from fastapi import FastAPI
from pydantic import BaseModel
from llm_engine import generate_sql
from db import save_query, load_queries, run_query
from nlp import is_similar
import logging
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace * with actual frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QueryInput(BaseModel):
    question: str
app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
def serve_index():
    return FileResponse(os.path.join("static", "index.html"))
@app.post("/query")
async def generate_sql_endpoint(query_input: QueryInput):
    try:

        question = query_input.question
        logger.info("Generating SQL for question: %s", question)
        if question in ["hi", "hello", "hey", "how are you", "help", 'thanks', 'thank you', 'thx', "how are you?", "what's up?"]:
            return {
                "query": query_input.question,
                "sql": None,
                "result": "Hi there! I can help you generate Reports. Please ask a question."
            }
        # Load existing queries
        existing_queries = load_queries()
        logger.info("Existing queries: %s", existing_queries)

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

        # Generate new SQL
        sql = generate_sql(question)
        save_query(question, sql)
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

    except Exception as e:
        logger.exception("Error generating SQL")
        return {"query": query_input.question, "error": str(e), "result": None}
