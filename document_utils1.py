# document_utils.py
from chromadb.utils import embedding_functions
import chromadb
import fitz        # PyMuPDF
import docx        # python-docx
import csv, os

# ===============================
# Chroma Setup
# ===============================
chroma_client = chromadb.PersistentClient(path="chroma_persistent_storage")
collection_name = "document_qa_collection"

ollama_ef = embedding_functions.OllamaEmbeddingFunction(
    model_name="nomic-embed-text",
    url="http://localhost:11434"
)

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
            for page in pdf:
                text += page.get_text()
            pdf.close()

        elif filename.endswith(".docx"):
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"

        elif filename.endswith(".csv"):
            with open(file_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                for row in reader:
                    text += ", ".join(row) + "\n"

        if text.strip():
            documents.append({"id": filename, "text": text})
    return documents

def split_text(text, chunk_size=1000, chunk_overlap=20):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = max(0, end - chunk_overlap)
    return chunks
