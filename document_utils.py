# document_utils.py
from chromadb.utils import embedding_functions
import chromadb
import fitz
import docx
import csv, os
from concurrent.futures import ThreadPoolExecutor
import requests

OLLAMA_URL = "http://localhost:11434"

# ===============================
# Chroma Setup
# ===============================
chroma_client = chromadb.PersistentClient(path="chroma_persistent_storage")
collection_name = "document_qa_collection"

ollama_ef = embedding_functions.OllamaEmbeddingFunction(
    model_name="nomic-embed-text",
    url="http://localhost:11434"
)

try:
    collection = chroma_client.get_collection(name=collection_name)
except:
    collection = chroma_client.create_collection(
        name=collection_name,
        embedding_function=ollama_ef
    )
def extract_exact_answer(question, chunks):
    """
    Use Ollama API to extract precise answers from relevant chunks.
    Returns the exact text answer.
    """
    context = "\n\n".join(chunks)
    prompt = f"""
    You are a precise assistant. Use the following context to answer exactly:

    Context:
    {context}

    Question:
    {question}

    Give a concise, fact-based answer (numbers, lists) without extra commentary.
    """

    response = requests.post(
        f"{OLLAMA_URL}/v1/completions",
        json={"model": "llama2:7b", "prompt": prompt, "max_tokens": 200}
    )
    print(response.json())
    if response.status_code == 200:
        data = response.json()
        # Ollama returns completion in data['completion']
        return data.get("completion", "").strip()
    else:
        return "⚠️ Unable to generate exact answer"
# ===============================
# Document Loader & Preload Helpers
# ===============================
def load_documents_from_directory(directory_path):
    documents = []
    for filename in os.listdir(directory_path):
        file_path = os.path.join(directory_path, filename)
        text = ""

        if filename.endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()

        elif filename.endswith(".pdf"):
            pdf = fitz.open(file_path)
            text = "\n".join([page.get_text() for page in pdf])
            pdf.close()

        elif filename.endswith(".docx"):
            doc = docx.Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])

        elif filename.endswith(".csv"):
            with open(file_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                text = "\n".join([", ".join(row) for row in reader])

        if text.strip():
            documents.append({"id": filename, "text": text})
    return documents

def split_text(text, chunk_size=1000, chunk_overlap=20):
    return [
        text[i : i + chunk_size]
        for i in range(0, len(text), chunk_size - chunk_overlap)
    ]

def preload_documents(directory_path):
    documents = load_documents_from_directory(directory_path)
    chunked_documents = []

    for doc in documents:
        chunks = split_text(doc["text"])
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc['id']}_chunk{i+1}"
            chunked_documents.append({"id": chunk_id, "text": chunk})

    # Use ThreadPoolExecutor to speed up embedding upsert
    def upsert_batch(batch):
        ids = [d["id"] for d in batch]
        texts = [d["text"] for d in batch]
        collection.upsert(ids=ids, documents=texts)

    batch_size = 50
    with ThreadPoolExecutor(max_workers=4) as executor:
        for i in range(0, len(chunked_documents), batch_size):
            executor.submit(upsert_batch, chunked_documents[i:i+batch_size])

    return chunked_documents
