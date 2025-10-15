from fastapi import FastAPI, Query, APIRouter
from pydantic import BaseModel
import pandas as pd
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_ollama import OllamaLLM
from fastapi.middleware.cors import CORSMiddleware
from src.config import OLLAMA_MODEL, VERBOSE
from fastapi.staticfiles import StaticFiles
import io
import re

# ✅ Load CSV once on startup
CSV_PATH = "data/data.csv"
df = pd.read_csv(CSV_PATH)

# ✅ Create the LangChain agent
def build_agent():
    llm = OllamaLLM(model=OLLAMA_MODEL)
    system_prompt = """
      You are a Python pandas analysis agent.
      - When given a query, execute the pandas operation silently.
      - Do NOT explain, reason, or describe.
      - ONLY return the final result (DataFrame or number or string).
      - Never include Python code or markdown in your output.
      """
    return create_pandas_dataframe_agent(
        llm=llm,
        df=df,
        verbose=VERBOSE,
        allow_dangerous_code=True,
        handle_parsing_errors=True,
        return_direct=True,
        prefix=system_prompt,
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
@router.post("/query")
async def query_agent(request: QueryRequest):
    try:
        # ---- Step 1: Format question for LLM ----
        question = (
            f"You are a Python data assistant. Return only the final pandas query result as plain text or markdown table. "
            f"Do NOT include code or explanations.\n\n{request.question.strip()}"
        )

        # ---- Step 2: Run LangChain agent ----
        result = agent.invoke({"input": question})

        # Extract the output
        output = result.get("output", result)

        # ---- Step 3: Handle clean DataFrame output ----
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
                justify="center"
            )
            return {
                "messages": [
                    {"sender": "user", "text": request.question},
                    {"sender": "bot", "isHTML": True, "text": html_table},
                ]
            }

        # ---- Step 4: Handle markdown table output ----
        if isinstance(output, str) and re.search(r"^\|.*\|", output, re.M):
            try:
                # Clean up markdown table text
                table_text = re.sub(r"^`+|`+$", "", output.strip())
                table_text = re.sub(r"^```[a-zA-Z]*", "", table_text)
                table_text = re.sub(r"```$", "", table_text).strip()

                # Convert markdown to DataFrame
                df = pd.read_csv(io.StringIO(table_text), sep="|").dropna(axis=1, how="all")

                # Drop empty header rows if any
                df.columns = [c.strip() for c in df.columns]
                df = df.loc[:, ~df.columns.str.contains("^Unnamed")]

                html_table = df.to_html(
                    index=False,
                    border=0,
                    classes="iris-table",
                    justify="center"
                )

                return {
                    "messages": [
                        {"sender": "user", "text": request.question},
                        {"sender": "bot", "isHTML": True, "text": html_table},
                    ]
                }

            except Exception as parse_err:
                print("⚠️ Table parse failed:", parse_err)
                pass

        # ---- Step 5: Fallback for text-only responses ----
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