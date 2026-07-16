#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
MODEL_DIR="$PROJECT_ROOT/models/camenbert"
mkdir -p "$MODEL_DIR"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Téléchargement CamenBert → ONNX int8      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── 1. Vérifier Python ──────────────────────────────
echo "━━━ [1/4] Vérification Python ───"
if ! command -v python3 &>/dev/null; then
  echo "❌ python3 introuvable. Installe Python 3.8+"
  exit 1
fi
echo "✓ python3: $(python3 --version)"

# ─── 2. Installer dépendances Python ─────────────────
echo "━━━ [2/4] Installation des dépendances Python ───"
echo "    (optimum + onnxruntime + transformers)"
echo "    Ça peut prendre 2-5 minutes selon le débit..."
echo ""

# Désactiver le progress bar seulement si on est dans un script non-interactif
export PIP_PROGRESS_BAR=on
echo "    → Installation de PyTorch (CPU-only, pas de CUDA)..."
pip install torch --index-url https://download.pytorch.org/whl/cpu 2>&1 | while IFS= read -r line; do
  echo "       $line"
done
echo "    → Installation de optimum + onnxruntime + transformers..."
pip install optimum onnxruntime transformers onnxscript 2>&1 | while IFS= read -r line; do
  echo "       $line"
done

echo ""
echo "✓ Dépendances installées"

# ─── 3. Télécharger CamenBert + exporter en ONNX ────
echo ""
echo "━━━ [3/4] Téléchargement CamenBert depuis HuggingFace ───"
echo "    Modèle: camembert-base (RoBERTa français, Inria)"
echo "    Labels: CREDIT_DEPOT, CREDIT_SALAIRE, CREDIT_TRANSFERT, DEBIT_PAIEMENT, DEBIT_RETRAIT, DEBIT_TRANSFERT, DEBIT_ACHAT_CREDIT, DEBIT_FRAIS, UNKNOWN"
echo "    (~500MB, peut prendre 2-5 minutes)"
echo ""

# Forcer CPU (pas de CUDA — inutile sans GPU NVIDIA)
export CUDA_VISIBLE_DEVICES=""

python3 << 'PYEOF'
import sys, os, json, shutil
from pathlib import Path

model_dir = Path(os.environ.get('MODEL_DIR', os.path.join(os.path.dirname(__file__), '..', 'model')))

sys.stdout.flush()

print("       📥 Chargement du tokenizer...")
sys.stdout.flush()
from transformers import AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained("camembert-base")
print("       ✓ Tokenizer chargé")

print("       📥 Chargement du modèle (cette étape télécharge ~500MB)...")
sys.stdout.flush()
from transformers import AutoModelForSequenceClassification
model = AutoModelForSequenceClassification.from_pretrained("camembert-base", num_labels=9)
print("       ✓ Modèle chargé")

ort_dir = model_dir / "onnx"
ort_dir.mkdir(exist_ok=True)

print("       🔄 Export vers ONNX (PyTorch natif)...")
sys.stdout.flush()

# Exporter via torch.onnx.export (pas besoin d'optimum)
import torch

class CamembertClassifier(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask):
        return self.model(input_ids=input_ids, attention_mask=attention_mask)[0]

dummy_input_ids = torch.randint(0, 1000, (1, 128), dtype=torch.int64)
dummy_attention_mask = torch.ones(1, 128, dtype=torch.int64)

torch.onnx.export(
    CamembertClassifier(model),
    (dummy_input_ids, dummy_attention_mask),
    str(ort_dir / "model.onnx"),
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids": {0: "batch", 1: "sequence"},
        "attention_mask": {0: "batch", 1: "sequence"},
        "logits": {0: "batch", 1: "sequence"},
    },
    opset_version=14,
    do_constant_folding=True,
)
print("       ✓ Export ONNX terminé")

# Copier config et vocab
# Note: torch.onnx.export peut créer un fichier de données externe (model.onnx.data)
# si les poids dépassent la limite protobuf. On le copie aussi si présent.
data_file = ort_dir / "model.onnx.data"
if data_file.exists():
    shutil.copy(str(data_file), str(model_dir / "model.onnx.data"))
    print(f"       ✓ Données externes copiées: {model_dir / 'model.onnx.data'}")
shutil.copy(str(ort_dir / "model.onnx"), str(model_dir / "camenbert-int8.onnx"))
print(f"       ✓ Modèle copié: {model_dir / 'camenbert-int8.onnx'}")

# Sauvegarder vocab.txt depuis le tokenizer
tokenizer.save_pretrained(str(ort_dir))
vocab_src = ort_dir / "vocab.txt" if (ort_dir / "vocab.txt").exists() else None
# Pour camembert, le tokenizer utilise sentencepiece, pas vocab.txt
# On crée un vocab.txt à partir du tokenizer
if not vocab_src:
    vocab_path = model_dir / "vocab.txt"
    with open(vocab_path, "w") as f:
        for token, idx in sorted(tokenizer.get_vocab().items(), key=lambda x: x[1]):
            f.write(f"{token}\n")
    print(f"       ✓ vocab.txt généré ({len(tokenizer.get_vocab())} tokens)")

config_src = ort_dir / "config.json"
if config_src.exists():
    shutil.copy(str(config_src), str(model_dir / "config.json"))

sys.stdout.flush()

# ─── 4. Quantification int8 ──
print("       ⚡ Quantification int8 (allège le modèle)...")
sys.stdout.flush()
model_path = str(ort_dir / "model.onnx")

try:
    from optimum.onnxruntime import ORTQuantizer
    quantizer = ORTQuantizer.from_pretrained(model_path)
    quantizer.quantize(
        quantization_config={
            "is_static": False,
            "per_channel": True,
            "op_types_to_quantize": ["MatMul", "Add"],
        },
        save_dir=str(model_dir),
        prefix="camenbert-int8",
    )
    # Renommer
    quantized = list(Path(str(model_dir)).glob("*int8*model*.onnx"))
    if quantized:
        dest = model_dir / "camenbert-int8.onnx"
        if dest.exists():
            dest.unlink()
        shutil.move(str(quantized[0]), str(dest))
        print(f"       ✓ Quantifié: {dest}")
except Exception as e:
    print(f"       ⚠️  Quantification impossible: {e}")
    shutil.copy(model_path, str(model_dir / "camenbert-int8.onnx"))
    data_file = ort_dir / "model.onnx.data"
    if data_file.exists():
        shutil.copy(str(data_file), str(model_dir / "model.onnx.data"))
        print(f"       ✓ Données externes copiées (fallback): {model_dir / 'model.onnx.data'}")
    print(f"       ✓ Modèle vanilla copié (non quantifié)")

# Nettoyage
shutil.rmtree(str(ort_dir), ignore_errors=True)

print()
print(f"       📦 Contenu du dossier model/:")
for f in sorted(model_dir.iterdir()):
    size = f.stat().st_size / (1024*1024)
    print(f"          {f.name:35s} {size:.1f} MB")
PYEOF

echo ""
echo "━━━ [4/4] Vérification ───"
if [ -f "$MODEL_DIR/camenbert-int8.onnx" ]; then
  SIZE=$(du -h "$MODEL_DIR/camenbert-int8.onnx" | cut -f1)
  echo "✓ Modèle ONNX: $MODEL_DIR/camenbert-int8.onnx ($SIZE)"
else
  echo "❌ Fichier modèle introuvable"
  ls -la "$MODEL_DIR"
  exit 1
fi

if [ -f "$MODEL_DIR/vocab.txt" ]; then
  echo "✓ Vocabulaire: $MODEL_DIR/vocab.txt"
else
  echo "❌ vocab.txt introuvable"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅ CamenBert prêt !                        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Prochaine étape :"
echo "   npm install onnxruntime-node"
echo ""
echo "Puis démarre l'app : npm run start:dev"
