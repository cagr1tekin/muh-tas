#!/bin/bash
# Fine-tune sonrası GGUF'u Ollama'ya yükle
# Önce: python finetune_qwen.py --export-gguf
# Sonra: bash ollama_load.sh

set -e

GGUF="ollama-model/qwen-raft-finans.gguf"
MODELFILE="ollama-model/Modelfile"
MODEL_NAME="qwen-raft-finans"

if [ ! -f "$GGUF" ]; then
  echo "HATA: $GGUF bulunamadı. Önce fine-tune ve GGUF export tamamlanmalı."
  echo "  python finetune_qwen.py --export-gguf"
  exit 1
fi

echo "=== Modelfile güncelleniyor ==="
# Modelfile'ı yeni GGUF'u gösterecek şekilde güncelle
cat > "$MODELFILE" << 'MODELFILE_CONTENT'
FROM ./qwen-raft-finans.gguf

PARAMETER temperature 0.0
PARAMETER num_predict 1000

PARAMETER stop "<|im_start|>"
PARAMETER stop "<|im_end|>"

TEMPLATE """<|im_start|>system
{{ .System }}<|im_end|>
<|im_start|>user
{{ .Prompt }}<|im_end|>
<|im_start|>assistant
"""

SYSTEM """Sen Türkiye ekonomisi uzmanı bir finansal analiz asistanısın. Gürültü (çeldirici) verileri filtreleyerek önce mantıksal bir 'Düşünce Zinciri' (durum analizi) oluştur, ardından sonucunu mutlaka JSON formatında ver. Portföy verildiğinde her döviz için AL, TUT veya SAT kararını da JSON'a ekle."""
MODELFILE_CONTENT

echo "=== Eski model kaldırılıyor ==="
ollama rm $MODEL_NAME 2>/dev/null || true

echo "=== Yeni model yükleniyor ==="
cd ollama-model
ollama create $MODEL_NAME -f Modelfile
cd ..

echo "=== Test ==="
ollama run $MODEL_NAME "2026-01 dönemi için kısa analiz yap" --format json 2>&1 | head -20

echo ""
echo "Model başarıyla yüklendi: $MODEL_NAME"
echo "Backend env: OLLAMA_MODEL=$MODEL_NAME"
