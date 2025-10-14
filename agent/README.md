# Ollama CSV QA Agent

A LangChain + Ollama agent that loads a CSV, allows the model to run pandas code, and answers natural language questions about the data.

## Features
- CLI agent that runs code (pandas) to compute truthful answers.
- Streamlit UI for uploading CSVs and chatting.
- Safe, minimal Conda environment included.

## Quickstart

1. Create the conda env:
```bash
conda env create -f environment.yml
conda activate ollama-agent

