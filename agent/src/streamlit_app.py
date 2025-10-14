"""
Streamlit UI:
- Upload a CSV
- Build an agent on the uploaded CSV
- Ask questions and show answers
"""

import streamlit as st
import pandas as pd
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from langchain_ollama import OllamaLLM
from src.preprocess import basic_preprocess
from src.config import OLLAMA_MODEL, VERBOSE
from io import BytesIO

st.set_page_config(page_title="Ollama CSV Agent", layout="wide")

st.title("Ollama CSV QA Agent")
st.markdown("Upload a CSV, the agent will use pandas to compute answers and reply truthfully.")

uploaded = st.file_uploader("Upload CSV", type=["csv"])
use_sample = st.checkbox("Use sample CSV (provided)", value=False)

if use_sample and uploaded is None:
    # load sample bundled with repo
    df = pd.read_csv("sample_data/data.csv")
else:
    df = None
    if uploaded is not None:
        try:
            df = pd.read_csv(uploaded)
        except Exception as e:
            st.error(f"Could not read CSV: {e}")

if df is not None:
    st.subheader("Preview")
    st.dataframe(df.head(10))

    if st.button("Build agent"):
        with st.spinner("Initializing Ollama model and building agent..."):
            df = basic_preprocess(df)
            llm = OllamaLLM(model=OLLAMA_MODEL)
            agent = create_pandas_dataframe_agent(llm, df, verbose=VERBOSE, allow_dangerous_code=True)
            st.session_state["agent"] = agent
            st.success("Agent ready! Ask questions below.")

    if "agent" in st.session_state:
        st.subheader("Ask the agent")
        question = st.text_input("Question", key="q_input")
        if st.button("Ask"):
            agent = st.session_state["agent"]
            if not question:
                st.warning("Type a question first.")
            else:
                with st.spinner("Thinking..."):
                    try:
                        try:
                            out = agent.run(question)
                        except Exception:
                            res = agent.invoke(question)
                            out = res.get("output") if isinstance(res, dict) else str(res)
                        st.markdown("**Answer:**")
                        st.code(out)
                    except Exception as e:
                        st.error(f"Error: {e}")

else:
    st.info("Upload a CSV or check 'Use sample CSV' to try the bundled example.")
