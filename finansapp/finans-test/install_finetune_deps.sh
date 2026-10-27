#!/bin/bash
# Fine-tune bağımlılıklarını Python 3.12 sanal ortamına kur
# Kullanım: bash install_finetune_deps.sh

VENV="c:/Users/ASUS/Desktop/uni/muh-tas/finansapp/finans-test/venv312"
PIP="$VENV/Scripts/pip.exe"

echo "=== PyTorch CUDA 12.4 ==="
"$PIP" install torch torchvision torchaudio \
  --index-url https://download.pytorch.org/whl/cu124 -q

echo "=== Fine-tune araçları ==="
"$PIP" install \
  transformers==4.47.1 \
  peft==0.14.0 \
  trl==0.14.0 \
  datasets==3.2.0 \
  accelerate==1.3.0 \
  bitsandbytes==0.45.4 \
  sentencepiece \
  protobuf \
  scipy \
  -q

echo "=== CUDA testi ==="
"$VENV/Scripts/python.exe" -c "
import torch
print('CUDA:', torch.cuda.is_available())
if torch.cuda.is_available():
    print('GPU:', torch.cuda.get_device_name(0))
    print('VRAM:', torch.cuda.get_device_properties(0).total_memory // 1024**3, 'GB')
"

echo "Kurulum tamamlandı."
echo "Fine-tune başlatmak için:"
echo "  $VENV/Scripts/python.exe finetune_qwen.py --export-gguf"
