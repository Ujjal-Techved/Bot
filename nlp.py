from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')

def is_similar(q1, q2, threshold=0.85):
    emb1 = model.encode(q1, convert_to_tensor=True)
    emb2 = model.encode(q2, convert_to_tensor=True)
    score = util.pytorch_cos_sim(emb1, emb2).item()
    return score >= threshold
