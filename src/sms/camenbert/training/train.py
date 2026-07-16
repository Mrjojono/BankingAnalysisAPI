#!/usr/bin/env python3
"""
Fine-tune camembert-base for SMS banking classification.
Exports to ONNX for production inference.

Usage:
    python3 train.py --data data.jsonl --epochs 5 --batch-size 16 --lr 2e-5

Labels:
    CREDIT_DEPOT, CREDIT_SALAIRE, CREDIT_TRANSFERT,
    DEBIT_PAIEMENT, DEBIT_RETRAIT, DEBIT_TRANSFERT,
    DEBIT_ACHAT_CREDIT, DEBIT_FRAIS, UNKNOWN
"""

import argparse
import json
import os
import sys
import shutil
from pathlib import Path

import torch
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
    EarlyStoppingCallback,
    TrainerCallback,
)
from datasets import Dataset as HFDataset
import evaluate
import numpy as np

LABELS = [
    "CREDIT_DEPOT", "CREDIT_SALAIRE", "CREDIT_TRANSFERT",
    "DEBIT_PAIEMENT", "DEBIT_RETRAIT", "DEBIT_TRANSFERT",
    "DEBIT_ACHAT_CREDIT", "DEBIT_FRAIS", "UNKNOWN",
]
LABEL2ID = {l: i for i, l in enumerate(LABELS)}
ID2LABEL = {i: l for i, l in enumerate(LABELS)}
NUM_LABELS = len(LABELS)
MODEL_NAME = "camembert-base"
MODEL_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "models" / "camenbert"


def emit(t: str, **kwargs):
    payload = {"t": t, **kwargs}
    print(json.dumps(payload), flush=True)


def parse_args():
    parser = argparse.ArgumentParser(description="Fine-tune CamenBert for SMS classification")
    parser.add_argument("--data", required=True, help="Path to JSONL training data")
    parser.add_argument("--epochs", type=int, default=5, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=2e-5, help="Learning rate")
    parser.add_argument("--output", default=str(MODEL_DIR), help="Output directory")
    parser.add_argument("--val-split", type=float, default=0.15, help="Validation split ratio")
    parser.add_argument("--test-split", type=float, default=0.10, help="Test split ratio")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    return parser.parse_args()


def load_data(path: str):
    texts, labels = [], []
    unknown = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            if "text" not in item or "label" not in item:
                continue
            if item["label"] not in LABEL2ID:
                unknown += 1
                continue
            texts.append(item["text"])
            labels.append(LABEL2ID[item["label"]])
    emit("log", m=f"{len(texts)} exemples chargés ({len(set(labels))} classes)")
    if unknown:
        emit("log", m=f"{unknown} labels inconnus ignorés")
    return texts, labels


def tokenize_function(examples, tokenizer):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=128,
    )


def compute_metrics(eval_pred):
    metric_acc = evaluate.load("accuracy")
    metric_f1 = evaluate.load("f1")
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    acc = metric_acc.compute(predictions=predictions, references=labels)
    f1 = metric_f1.compute(predictions=predictions, references=labels, average="weighted")
    return {**acc, **f1}


def export_to_onnx(model, tokenizer, output_dir: Path):
    onnx_dir = output_dir / "onnx_tmp"
    onnx_dir.mkdir(exist_ok=True)
    onnx_path = onnx_dir / "model.onnx"

    class WrappedModel(torch.nn.Module):
        def __init__(self, model):
            super().__init__()
            self.model = model

        def forward(self, input_ids, attention_mask):
            return self.model(input_ids=input_ids, attention_mask=attention_mask)[0]

    model.eval()
    dummy_input_ids = torch.randint(0, 1000, (1, 128), dtype=torch.int64)
    dummy_attention_mask = torch.ones(1, 128, dtype=torch.int64)

    torch.onnx.export(
        WrappedModel(model),
        (dummy_input_ids, dummy_attention_mask),
        str(onnx_path),
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "sequence"},
            "attention_mask": {0: "batch", 1: "sequence"},
            "logits": {0: "batch", 1: "sequence"},
        },
        opset_version=18,
        do_constant_folding=True,
    )
    size_mb = onnx_path.stat().st_size / 1e6
    emit("log", m=f"Export ONNX terminé ({size_mb:.1f} MB)")

    dest = output_dir / "camenbert-int8.onnx"
    shutil.copy(str(onnx_path), str(dest))
    emit("log", m=f"Modèle copié: {dest}")

    shutil.rmtree(str(onnx_dir), ignore_errors=True)

    vocab_path = output_dir / "vocab.txt"
    if not vocab_path.exists():
        with open(vocab_path, "w") as f:
            for token, idx in sorted(tokenizer.get_vocab().items(), key=lambda x: x[1]):
                f.write(f"{token}\n")
        emit("log", m=f"vocab.txt généré ({len(tokenizer.get_vocab())} tokens)")

    tokenizer.save_pretrained(str(output_dir))
    emit("log", m="Tokenizer sauvegardé")


class ProgressCallback(TrainerCallback):
    def __init__(self, total_epochs):
        super().__init__()
        self.total_epochs = total_epochs

    def on_log(self, args, state, control, model=None, **kwargs):
        if state.log_history:
            last = state.log_history[-1]
            if "loss" in last and "epoch" in last:
                emit("epoch",
                     epoch=int(last["epoch"]),
                     totalEpochs=self.total_epochs,
                     loss=round(last["loss"], 4))

    def on_epoch_end(self, args, state, control, model=None, **kwargs):
        if state.log_history:
            logs = [h for h in state.log_history if "eval_loss" in h]
            if logs:
                last = logs[-1]
                emit("epoch",
                     epoch=int(last.get("epoch", 0)),
                     totalEpochs=self.total_epochs,
                     loss=round(last.get("eval_loss", 0), 4),
                     accuracy=round(last.get("eval_accuracy", 0), 4),
                     f1=round(last.get("eval_f1", 0), 4))


def main():
    args = parse_args()
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    emit("log", m="Démarrage de l'entraînement...")

    # 1. Load data
    emit("log", m="Chargement des données...")
    texts, labels = load_data(args.data)
    if len(texts) < 10:
        emit("error", m="Trop peu de données (minimum 10 exemples)")
        sys.exit(1)

    from collections import Counter
    class_counts = Counter(labels)
    emit("log", m=f"Répartition: {len(class_counts)} classes")
    for label_id, count in class_counts.most_common():
        emit("log", m=f"  {ID2LABEL[label_id]}: {count}")

    # 2. Split
    emit("log", m="Split train/val/test...")
    from sklearn.model_selection import train_test_split

    val_split = args.val_split if len(texts) >= 50 else 0.2
    test_split = args.test_split if len(texts) >= 50 else 0.1

    try:
        train_texts, temp_texts, train_labels, temp_labels = train_test_split(
            texts, labels, test_size=val_split + test_split, random_state=args.seed, stratify=labels
        )
    except ValueError:
        train_texts, temp_texts, train_labels, temp_labels = train_test_split(
            texts, labels, test_size=val_split + test_split, random_state=args.seed
        )
    try:
        val_texts, test_texts, val_labels, test_labels = train_test_split(
            temp_texts, temp_labels, test_size=test_split / (val_split + test_split),
            random_state=args.seed, stratify=temp_labels,
        )
    except ValueError:
        val_texts, test_texts, val_labels, test_labels = train_test_split(
            temp_texts, temp_labels, test_size=test_split / (val_split + test_split),
            random_state=args.seed,
        )
    emit("log", m=f"Train: {len(train_texts)} | Val: {len(val_texts)} | Test: {len(test_texts)}")

    # 3. Load model
    emit("log", m=f"Chargement de {MODEL_NAME}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME, num_labels=NUM_LABELS,
        id2label=ID2LABEL, label2id=LABEL2ID,
    )
    emit("log", m="Modèle chargé")

    # 4. Train
    emit("log", m="Tokenization...")
    train_dataset = HFDataset.from_dict({"text": train_texts, "label": train_labels})
    val_dataset = HFDataset.from_dict({"text": val_texts, "label": val_labels})
    test_dataset = HFDataset.from_dict({"text": test_texts, "label": test_labels})

    train_dataset = train_dataset.map(lambda x: tokenize_function(x, tokenizer), batched=True)
    val_dataset = val_dataset.map(lambda x: tokenize_function(x, tokenizer), batched=True)
    test_dataset = test_dataset.map(lambda x: tokenize_function(x, tokenizer), batched=True)
    emit("log", m="Tokenization terminée")

    training_args = TrainingArguments(
        output_dir=str(output_dir / "training_output"),
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=args.lr,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size * 2,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        logging_dir=str(output_dir / "logs"),
        logging_steps=1,
        report_to="none",
        seed=args.seed,
    )

    emit("log", m=f"Entraînement: {args.epochs} epochs, batch={args.batch_size}, lr={args.lr}")

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3), ProgressCallback(args.epochs)],
    )

    trainer.train()
    emit("log", m="Entraînement terminé")

    # 5. Evaluate
    emit("log", m="Évaluation sur le jeu de test...")
    metrics = trainer.evaluate(test_dataset)
    accuracy = metrics.get("eval_accuracy", 0)
    f1 = metrics.get("eval_f1", 0)
    emit("log", m=f"Accuracy: {accuracy*100:.1f}% | F1: {f1*100:.1f}%")

    export_to_onnx(model, tokenizer, output_dir)

    result = {
        "accuracy": accuracy,
        "f1": f1,
        "epochs": args.epochs,
        "samples": len(texts),
    }

    result_path = output_dir / "training_result.json"
    with open(result_path, "w") as f:
        json.dump(result, f, indent=2)

    emit("complete", accuracy=accuracy, f1=f1, epochs=args.epochs, samples=len(texts),
         modelPath=str(output_dir / "camenbert-int8.onnx"))


if __name__ == "__main__":
    main()
