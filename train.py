from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments
)
import torch
import json

# -------------------------------
# 1. Load data
# -------------------------------
with open("data.json", "r", encoding="utf-8") as f:
    QUERY_DATA = json.load(f)

data = {
    "input": [item["question"] for item in QUERY_DATA],
    "output": [item["sql"] for item in QUERY_DATA]
}
print(data)

dataset = Dataset.from_dict(data)
dataset = dataset.train_test_split(test_size=0.2)

# -------------------------------
# 2. Load tokenizer & model
# -------------------------------
model_name = "t5-small"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# -------------------------------
# 3. Preprocess data
# -------------------------------
def preprocess(example):
    # Add task prefix to help T5 understand the task
    inputs = tokenizer(
        "translate English to SQL: " + example["input"],
        padding="max_length", truncation=True, max_length=128
    )
    labels = tokenizer(
        example["output"],
        padding="max_length", truncation=True, max_length=256
    )
    inputs["labels"] = labels["input_ids"]
    return inputs

train_dataset = dataset["train"].map(preprocess, batched=False)
test_dataset = dataset["test"].map(preprocess, batched=False)

# -------------------------------
# 4. Training arguments
# -------------------------------
training_args = Seq2SeqTrainingArguments(
    output_dir="./sql_model",
    eval_strategy="epoch",   # ✅ FIXED
    learning_rate=2e-5,
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    num_train_epochs=5,
    weight_decay=0.01,
    save_total_limit=2,
    predict_with_generate=True,
    logging_dir="./logs",
    logging_steps=10
)

# -------------------------------
# 5. Trainer
# -------------------------------
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
    tokenizer=tokenizer
)

# -------------------------------
# 6. Train the model
# -------------------------------
trainer.train()

# -------------------------------
# 7. Function to generate SQL
# -------------------------------
def generate_sql(nl_query):
    inputs = tokenizer(
        "translate English to SQL: " + nl_query,
        return_tensors="pt", padding=True
    )
    outputs = model.generate(**inputs, max_length=128)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

# -------------------------------
# 8. Test the model
# -------------------------------
print("\n🔹 Testing the trained model:\n")
queries = [
    "translate English to SQL: Which CRs/NRs should I prioritize this week?",
    "translate English to SQL: How many CRs were delivered last quarter?",
    "translate English to SQL: What’s our average CR turnaround time?"
]

for q in queries:
    print(f"Q: {q}")
    print(f"SQL: {generate_sql(q)}\n")
