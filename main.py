# main.py
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging, os

from db import save_query, load_queries, run_query
from nlp import match_nlp_query
from params import extract_params
from document_utils import preload_documents, collection, split_text, extract_exact_answer

# ===============================
# FastAPI Setup
# ===============================
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with frontend origin in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===============================
# Pydantic Models
# ===============================
class ChatInput(BaseModel):
    question: str

class QueryInput(BaseModel):
    question: str

# ===============================
# Preload Documents
# ===============================
directory_path = "./new_data"
chunked_documents = preload_documents(directory_path)
logger.info(f"✅ Loaded {len(chunked_documents)} document chunks.")

# ===============================
# Helper Functions
# ===============================
def query_documents(question, n_results=5):
    """Query Chroma collection for relevant chunks."""
    try:
        results = collection.query(
            query_texts=[question],
            n_results=n_results
        )
        return results["documents"][0] if results and "documents" in results else []
    except Exception as e:
        logger.exception("❌ Error while querying documents: %s", e)
        return []

def generate_doc_response(question, relevant_chunks):
    """Format response from document chunks."""
    context = "\n\n".join(relevant_chunks)
    return {
        "answer": f"Based on the documents, here’s what I found:\n{context[:500]}..."
    }

# ===============================
# Routes
# ===============================
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join("static", "index.html"))

@app.post("/query")
async def generate_sql_endpoint(query_input: QueryInput):
    try:
        question = query_input.question.strip()
        logger.info("SQL Question: %s", question)

        # Casual greetings
        casual_keywords = ["hi", "hello", "hey", "thanks", "thank you"]
        if question.lower() in casual_keywords:
            return {
                "query": question,
                "sql": None,
                "result": "Hi there! I can help you generate Reports. Please ask a question."
            }

        # Try NLP match
        params = extract_params(question)
        matched = match_nlp_query(question)
        if matched:
            sql = matched["sql"]
            raw_result = run_query(sql)
            if not raw_result:
                result_value = None
            elif len(raw_result) == 1 and len(raw_result[0]) == 1:
                result_value = list(raw_result[0].values())[0]
            else:
                result_value = raw_result
            return {
                "query": question,
                "sql": sql,
                "result": result_value,
                "intent": matched["intent"],
                "similarity": matched["similarity_score"]
            }

        # Generate new SQL
        sql, intent = generate_sql(question, params=params)
        save_query(question, sql, intent=intent, params=params)
        raw_result = run_query(sql)
        if not raw_result:
            result_value = None
        elif len(raw_result) == 1 and len(raw_result[0]) == 1:
            result_value = list(raw_result[0].values())[0]
        else:
            result_value = raw_result

        return {"query": question, "sql": sql, "result": result_value}

    except Exception as e:
        logger.exception("Error generating SQL")
        return {"query": query_input.question, "error": str(e), "result": None}

@app.post("/chat")
async def chat_endpoint(chat_input: ChatInput):
    try:
        question = chat_input.question.strip()
        logger.info("Document Chat question: %s", question)

        relevant_chunks = query_documents(question)

        if not relevant_chunks:
            return {"query": question, "answer": "⚠️ No relevant information found in the documents."}

        # Generate exact answer using Ollama
        exact_answer = extract_exact_answer(question, relevant_chunks)

        return {
            "query": question,
            "answer": exact_answer,
            "source": "documents",
            "chunks_used": len(relevant_chunks)
        }

    except Exception as e:
        logger.exception("Error in document chat endpoint")
        return {"query": chat_input.question, "error": str(e), "result": None}
