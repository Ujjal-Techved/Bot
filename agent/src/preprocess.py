"""
Preprocessing helpers (cleaning/typing) for the CSV before passing to the agent.
"""

import pandas as pd

def basic_preprocess(df: pd.DataFrame) -> pd.DataFrame:
    # Example safe preprocessing:
    # - strip column names
    # - convert numeric-like columns to numeric
    df = df.copy()
    df.columns = [c.strip() for c in df.columns]

    for col in df.columns:
        if df[col].dtype == object:
            # try to coerce numeric columns
            try:
                df[col] = pd.to_numeric(df[col].str.replace(",", "").str.strip())
            except Exception:
                # leave as-is
                pass
    return df
