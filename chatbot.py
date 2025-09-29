import pandas as pd
import glob
from langchain.llms import GPT4All
from langchain.chains import RetrievalQA
from langchain.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.docstore.document import Document
import os

# ==== CONFIG ====
DATA_FOLDER = "./data"  # folder containing your CSV files
MODEL_PATH = "./models/ggml-gpt4all-j-v1.3-groovy.bin"  # model path
# =================

# Load all CSV files from folder
docs = []
csv_files = glob.glob(os.path.join(DATA_FOLDER, "*.csv"))

if not csv_files:
    print("❌ No CSV files found in folder:", DATA_FOLDER)
    exit()

print(f"Found {len(csv_files)} CSV files. Loading data...")

for file_path in csv_files:
    df = pd.read_csv(file_path)
    for _, row in df.iterrows():
        text = " | ".join([f"{col}: {row[col]}" for col in df.columns])
        docs.append(Document(page_content=text, metadata={"source": os.path.basename(file_path)}))

print(f"✅ Loaded {len(docs)} rows from {len(csv_files)} CSV files.")

# Create embeddings
print("Creating embeddings...")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Create vector store
db = Chroma.from_documents(docs, embeddings)
retriever = db.as_retriever()

# Load GPT4All model
print("Loading GPT4All model...")
llm = GPT4All(model=MODEL_PATH, verbose=False)

# Create QA chain
qa = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

# Chat loop
print("\n✅ Chatbot is ready! Type 'exit' to quit.\n")
while True:
    query = input("Ask a question: ")
    if query.lower() in ["exit", "quit"]:
        break
    answer = qa.run(query)
    print(f"\nAnswer: {answer}\n")
