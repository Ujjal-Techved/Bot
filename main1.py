from fastapi import FastAPI
from pydantic import BaseModel
from llm_engine import generate_sql
from db import save_query, load_queries, run_query
from nlp import match_nlp_query
from params import extract_params
import logging
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import fitz        # PyMuPDF
import docx        # python-docx
import csv, requests, chromadb
from chromadb.utils import embedding_functions
from scheduler import start_scheduler
from document_utils import load_documents_from_directory, split_text, chroma_client, ollama_ef, collection_name
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
class ChatInput(BaseModel):
    question: str
def ollama_chat(prompt, model="llama2:7b"):
    resp = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": model, "prompt": prompt, "stream": False},
    )
    return resp.json()["response"]

# ===============================
# Chroma Setup
# ===============================
# chroma_client = chromadb.PersistentClient(path="chroma_persistent_storage")
# collection_name = "document_qa_collection"

# try:
#     chroma_client.delete_collection(collection_name)
# except Exception:
#     pass

# ollama_ef = embedding_functions.OllamaEmbeddingFunction(
#     model_name="nomic-embed-text",
#     url="http://localhost:11434"
# )

collection = chroma_client.get_or_create_collection(
    name=collection_name,
    embedding_function=ollama_ef
)
# ===============================
# Document Loader & Preload
# ===============================
# def load_documents_from_directory(directory_path):
#     documents = []
#     for filename in os.listdir(directory_path):
#         file_path = os.path.join(directory_path, filename)
#         text = ""
#
#         if filename.endswith(".txt"):
#             with open(file_path, "r", encoding="utf-8") as f:
#                 text = f.read()
#
#         elif filename.endswith(".pdf"):
#             pdf = fitz.open(file_path)
#             for page in pdf:
#                 text += page.get_text()
#             pdf.close()
#
#         elif filename.endswith(".docx"):
#             doc = docx.Document(file_path)
#             for para in doc.paragraphs:
#                 text += para.text + "\n"
#
#         elif filename.endswith(".csv"):
#             with open(file_path, "r", encoding="utf-8") as f:
#                 reader = csv.reader(f)
#                 for row in reader:
#                     text += ", ".join(row) + "\n"
#
#         if text.strip():
#             documents.append({"id": filename, "text": text})
#     return documents

# def split_text(text, chunk_size=1000, chunk_overlap=20):
#     chunks = []
#     start = 0
#     while start < len(text):
#         end = start + chunk_size
#         chunks.append(text[start:end])
#         if end >= len(text):
#             break
#         start = max(0, end - chunk_overlap)
#     return chunks

directory_path = "./new_data"
documents = load_documents_from_directory(directory_path)

chunked_documents = []
for doc in documents:
    chunks = split_text(doc["text"])
    for i, chunk in enumerate(chunks):
        chunk_id = f"{doc['id']}_chunk{i+1}"
        chunked_documents.append({"id": chunk_id, "text": chunk})

for doc in chunked_documents:
    collection.upsert(ids=[doc["id"]], documents=[doc["text"]])


# ===============================
# Query + Response
# ===============================
def query_documents(question, n_results=5):
    try:
        # Always fetch latest collection
        collection = chroma_client.get_or_create_collection(
            name=collection_name,
            embedding_function=ollama_ef
        )

        results = collection.query(query_texts=[question], n_results=n_results)
        return results["documents"][0]

    except Exception as e:
        logger.exception("❌ Error while querying documents: %s", e)
        return []


def generate_doc_response(question, relevant_chunks):
    context = "\n\n".join(relevant_chunks)
    prompt = (
        "You are a helpful assistant. Use the following context to answer the question. "
        "Provide the response strictly in JSON format so I can parse it easily.\n"
        "If you don’t know, say you don’t know in the JSON. Keep the answer concise.\n\n"
        f"Context:\n{context}\n\nQuestion:\n{question}\n\n"
        "Respond in this JSON format:\n"
        "{\n"
        '  "answer": "<your concise answer here>"\n'
        "}"
    )
    return ollama_chat(prompt, model="llama2:7b")


class QueryInput(BaseModel):
    question: str
app.mount("/static", StaticFiles(directory="static"), name="static")
#start_scheduler()
@app.get("/")
def serve_index():
    return FileResponse(os.path.join("static", "demo.html"))
@app.post("/query")
async def generate_sql_endpoint(query_input: QueryInput):
    try:

        question = query_input.question
        logger.info("Generating SQL for question: %s", question)
        casual_keywords = [
            "hi", "hello", "hey", "how are you", "hay how r u", "help",
            "thanks", "thank you", "thx", "what's up", "are you real"
        ]
        report_keywords = [
            "report", "data", "show", "list", "count", "how many", "number of",
            "generate", "summary", "chart", "table", "deliver", "created", "closed"
        ]
        q = question.lower().strip()
        if q in casual_keywords:
            return {
                "query": query_input.question,
                "sql": None,
                "result": "Hi there! I can help you generate Reports. Please ask a question."
            }

        # Load existing queries
        params = extract_params(question)
        matched = match_nlp_query(question)
        print(matched)
        print("Matched")
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

@app.post("/chat")
async def chat_endpoint(chat_input: ChatInput):
    try:
        question = chat_input.question.strip()
        logger.info("Document Chat question: %s", question)

        relevant_chunks = query_documents(question)
        if not relevant_chunks:
            return {"query": question, "answer": "⚠️ No relevant information found in the documents."}

        answer = generate_doc_response(question, relevant_chunks)
        logger.info("Document Chat answer: %s", answer)
        return {"query": question, "answer": answer, "source": "documents"}

    except Exception as e:
        logger.exception("Error in document chat endpoint")
        return {"query": chat_input.question, "error": str(e), "result": None}