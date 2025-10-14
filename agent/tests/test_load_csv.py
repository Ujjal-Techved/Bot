import pandas as pd
from src.utils import load_csv

def test_load_sample():
    df = load_csv("data/data.csv")
    assert isinstance(df, pd.DataFrame)
    assert "region" in df.columns
