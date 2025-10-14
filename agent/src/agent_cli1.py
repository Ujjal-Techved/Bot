import argparse
import pandas as pd
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_ollama import OllamaLLM
from langchain_experimental.tools.python.tool import PythonAstREPLTool
from langchain.agents import AgentExecutor
from src.utils import load_csv
from src.config import OLLAMA_MODEL, VERBOSE


def build_agent(df):
    """Build a LangChain Pandas agent powered by Ollama."""
    llm = OllamaLLM(model=OLLAMA_MODEL)
    python_tool = PythonAstREPLTool()

    agent = create_pandas_dataframe_agent(
        llm=llm,
        df=df,
        verbose=VERBOSE,
        allow_dangerous_code=True,
        agent_type="zero-shot-react-description",
        handle_parsing_errors=True,   # ✅ moved here
        include_df_in_prompt=True,    # ✅ gives model better context
    )

    return agent

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=str, required=True, help="Path to CSV file")
    args = parser.parse_args()

    print("📊 Loading and preparing data...")
    df = load_csv(args.csv)

    print(f"✅ Data loaded successfully: {len(df)} rows, {len(df.columns)} columns\n")
    print(f"Columns: {list(df.columns)}\n")

    agent = build_agent(df)

    print("🤖 Agent ready! Ask your questions below (type 'exit' to quit).")

    while True:
        q = input("\nQuestion> ").strip()
        if q.lower() in ["exit", "quit"]:
            print("👋 Exiting.")
            break

        if not q:
            continue

        try:
            result = agent.invoke({"input": q})
            print("\n💡 Answer:\n", result["output"])
        except Exception as e:
            print("\n❌ Error answering:", str(e))


if __name__ == "__main__":
    main()
