"""
CLI entry-point: load CSV and create a LangChain Pandas agent powered by Ollama.
The agent runs python code (pandas) to compute answers.
"""

import argparse
import pandas as pd
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_ollama import OllamaLLM
from langchain_experimental.tools.python.tool import PythonAstREPLTool
from langchain.agents import AgentExecutor
from langchain.tools import Tool  # ✅ FIXED import

from src.utils import load_csv, preview_and_summary
from src.preprocess import basic_preprocess
from src.config import OLLAMA_MODEL, VERBOSE
python_tool = PythonAstREPLTool()
tools = [
    Tool(
        name="python_repl_ast",
        func=python_tool.run,
        description="A Python shell. Use this to execute python commands."
    ),
]

def build_agent(df):
    """Build a Pandas-aware agent powered by Ollama."""
    llm = OllamaLLM(model=OLLAMA_MODEL)

    # Register the Python tool for executing dataframe code
    python_tool = PythonAstREPLTool()

    agent = create_pandas_dataframe_agent(
        llm=llm,
        df=df,
        verbose=VERBOSE,
        allow_dangerous_code=True,
        agent_type="zero-shot-react-description",
        tools=[python_tool],
    )

    # Wrap it in an executor with parsing error handling enabled
    agent_executor = AgentExecutor.from_agent_and_tools(
        agent=agent,
        tools=[python_tool],
        verbose=VERBOSE,
        handle_parsing_errors=True,   # ✅ prevents OUTPUT_PARSING_FAILURE
    )

    return agent_executor

def main():
    parser = argparse.ArgumentParser(description="CSV QA agent (CLI)")
    parser.add_argument("--csv", "-c", required=True, help="Path to CSV file")
    parser.add_argument("--nrows", type=int, default=None, help="Optional: load only first N rows")
    args = parser.parse_args()

    df = load_csv(args.csv, nrows=args.nrows)
    df = basic_preprocess(df)

    preview, summary = preview_and_summary(df)
    print("=== Data preview ===")
    print(preview)
    print("\n=== Data summary ===")
    print(summary)
    print("\nBuilding agent (this will initialize the local Ollama LLM)...")

    agent = build_agent(df)
    print("Agent ready! Ask questions. Type 'exit' to quit.\n")

    while True:
        q = input("Question> ").strip()
        if not q:
            continue
        if q.lower() in ("exit", "quit"):
            break
        try:
            # agent.invoke returns a dict in some langchain-experimental versions; agent.run returns str
            # try run -> fallback to invoke
            try:
                out = agent.invoke(q)
            except Exception:
                res = agent.invoke(q)
                out = res.get("output") if isinstance(res, dict) else str(res)
            print("\nAnswer:")
            print(out)
        except Exception as e:
            print("Error answering:", e)

if __name__ == "__main__":
    main()
