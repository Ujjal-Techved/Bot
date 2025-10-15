from fastapi import FastAPI, Query
from pydantic import BaseModel
import pandas as pd
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_ollama import OllamaLLM
from fastapi.middleware.cors import CORSMiddleware
from src.config import OLLAMA_MODEL, VERBOSE
from fastapi.staticfiles import StaticFiles

# ✅ Load CSV once on startup
CSV_PATH = "data/data.csv"
df = pd.read_csv(CSV_PATH)

# ✅ Create the LangChain agent
def build_agent():
    llm = OllamaLLM(model=OLLAMA_MODEL)
    return create_pandas_dataframe_agent(
        llm=llm,
        df=df,
        verbose=VERBOSE,
        allow_dangerous_code=True,
        handle_parsing_errors=True,
        return_direct=True
    )

agent = build_agent()

# ✅ Initialize FastAPI
app = FastAPI(title="CSV Q&A Agent API")

# ✅ Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your domain in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

@app.get("/")
def root():
    return {"message": "CSV Agent API is running!"}

app.mount("/static", StaticFiles(directory="static"), name="static")
@app.post("/query")
async def query_agent(request: QueryRequest):
    try:

        # Run the agent
        question = f"You are a Python data assistant. Return only the result of the pandas query, not explanations.\n\n{request.question.strip()}"
        result = agent.invoke({"input": question})

        # Handle possible DataFrame or text output
        output = result.get("output", result)
        # --- Case 1: Output is a pandas DataFrame ---
        if isinstance(output, pd.DataFrame):
            if output.empty:
                return {
                    "messages": [
                        {"sender": "user", "text": request.question},
                        {"sender": "bot", "text": "No matching rows found."},
                    ]
                }

            html_table = output.to_html(
                index=False,
                border=0,
                classes="iris-table",
                justify="center",
            )

            message = f"Found {len(output)} rows matching your query."
            return {
                "messages": [
                    {"sender": "user", "text": request.question},
                    {"sender": "bot", "text": message},
                    {"sender": "bot", "isHTML": True, "text": html_table},
                ]
            }

        # --- Case 2: Output is a list of dicts (common for JSON-style data) ---
        elif isinstance(output, list):
            if not output:
                return {
                    "messages": [
                        {"sender": "user", "text": request.question},
                        {"sender": "bot", "text": "No results found."},
                    ]
                }

            df = pd.DataFrame(output)
            html_table = df.to_html(index=False, border=0, classes="iris-table")
            return {
                "messages": [
                    {"sender": "user", "text": request.question},
                    {"sender": "bot", "isHTML": True, "text": html_table},
                ]
            }

        # --- Case 3: Output is text ---
        else:
            return {
                "messages": [
                    {"sender": "user", "text": request.question},
                    {"sender": "bot", "text": str(output)},
                ]
            }

    except Exception as e:
        print("❌ Error in /query:", e)
        return {
            "messages": [
                {"sender": "user", "text": request.question},
                {"sender": "bot", "text": f"❌ Error: {str(e)}"},
            ]
        }

    except Exception as e:
        return {
            "messages": [
                {"sender": "user", "text": request.question},
                {"sender": "bot", "text": f"❌ Error: {str(e)}"},
            ]
        }
