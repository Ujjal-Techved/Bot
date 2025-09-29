import json
from sentence_transformers import SentenceTransformer, util

# Load the model once
model = SentenceTransformer('all-MiniLM-L6-v2')

# Load queries from JSON
with open("data.json", "r", encoding="utf-8") as f:
    QUERY_DATA = json.load(f)

def is_similar(q1, q2, threshold=0.85):
    emb1 = model.encode(q1, convert_to_tensor=True)
    emb2 = model.encode(q2, convert_to_tensor=True)
    score = util.pytorch_cos_sim(emb1, emb2).item()
    return score >= threshold

def match_nlp_query(user_question, params=None, threshold=0.80):
    """
    Find best matching intent & SQL for a user's question.
    :param user_question: str, the question
    :param params: dict, optional dynamic parameters for SQL placeholders
    :param threshold: float, similarity threshold
    :return: dict {intent, sql, question, similarity_score} or None if no match
    """
    user_embedding = model.encode(user_question, convert_to_tensor=True)

    best_match = None
    best_score = -1

    for q in QUERY_DATA:
        query_embedding = model.encode(q["question"], convert_to_tensor=True)
        score = util.pytorch_cos_sim(user_embedding, query_embedding).item()

        if score > best_score:
            best_score = score
            best_match = q

    if best_score < threshold:
        return None  # No good match found

    sql_template = best_match["sql"]

    # Fill in parameters if provided
    if params:
        if isinstance(sql_template, dict):
            sql_template = {k: v.format(**params) for k, v in sql_template.items()}
        else:
            sql_template = sql_template.format(**params)

    return {
        "intent": best_match["intent"],
        "question": best_match["question"],
        "sql": sql_template,
        "similarity_score": best_score
    }
