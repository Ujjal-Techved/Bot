import os
import pandas as pd
from typing import Tuple

def load_csv(path: str, nrows: int | None = None) -> pd.DataFrame:
    """
    Load CSV into pandas DataFrame.
    - path: path to csv
    - nrows: optional limit for quick debug
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"CSV not found: {path}")
    df = pd.read_csv(path, nrows=nrows)
    return df

def preview_and_summary(df: pd.DataFrame, preview_rows: int = 5) -> Tuple[str, str]:
    preview = df.head(preview_rows).to_string(index=False)
    try:
        summary = df.describe(include="all").to_string()
    except Exception:
        summary = df.describe().to_string()
    return preview, summary
