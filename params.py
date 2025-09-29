import re
from datetime import datetime

def extract_params(question: str):
    """
    Extract parameters from a natural language question.
    Returns a dict of possible parameters.
    """
    params = {}

    # Project ID → look for "project 2483" or "proj 2483"
    match = re.search(r"(?:project|proj)\s+(\d+)", question, re.IGNORECASE)
    if match:
        params["project_id"] = int(match.group(1))

    # CR code → look for CR followed by digits
    match = re.search(r"\bCR\s?(\d+)\b", question, re.IGNORECASE)
    if match:
        params["cr_code"] = f"CR{match.group(1)}"

    # Keyword → look for phrases after 'containing' or 'with keyword'
    match = re.search(r"(?:containing|with keyword)\s+'([^']+)'", question, re.IGNORECASE)
    if match:
        params["keyword"] = match.group(1)

    # Month and year → e.g. "January 2024", "Jan 2024"
    match = re.search(r"\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})", question, re.IGNORECASE)
    if match:
        month_str = match.group(1)
        month_num = datetime.strptime(month_str, "%B").month if len(month_str) > 3 else datetime.strptime(month_str, "%b").month
        params["month"] = month_num
        params["year"] = int(match.group(2))

    return params
