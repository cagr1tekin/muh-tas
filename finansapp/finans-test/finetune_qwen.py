"""
Qwen2.5-3B RAFT Fine-Tune Script
----------------------------------
RTX 4060 8GB VRAM için optimize edilmiş QLoRA fine-tuning.
Model: Qwen/Qwen2.5-3B-Instruct (HuggingFace'den indirilir)
Dataset: raft_dataset_augmented.jsonl
Çıktı: finetuned-qwen/ (GGUF export için)

Kullanım:
  python finetune_qwen.py
  python finetune_qwen.py --export-gguf   (eğitim + GGUF export)
"""

import argparse
import json
from pathlib import Path

DATASET_PATH = Path("raft_dataset_augmented.jsonl")
OUTPUT_DIR   = Path("finetuned-qwen")
GGUF_PATH    = Path("ollama-model/qwen-raft-finans.gguf")
BASE_MODEL   = "Qwen/Qwen2.5-3B-Instruct"
MAX_SEQ_LEN  = 1024

SYSTEM_PROMPT = (
    "Sen Türkiye ekonomisi uzmanı bir finansal analiz asistanısın. "
    "Gürültü (çeldirici) verileri filtreleyerek önce mantıksal bir 'Düşünce Zinciri' "
    "(durum analizi) oluştur, ardından sonucunu mutlaka JSON formatında ver. "
    "Portföy verildiğinde her döviz için AL, TUT veya SAT kararını da JSON'a ekle."
)


def load_jsonl(path: Path):
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def format_sample(sample: dict) -> str:
    parts = [sample.get("question", "")]
    if ctx := sample.get("context", ""):
        parts.append(f"\nMAKRO BAĞLAM:\n{ctx}")
    if pf := sample.get("portfolio_context", ""):
        parts.append(f"\nKULLANICI PORTFÖYİ:\n{pf}")
    if news := sample.get("news_context", ""):
        parts.append(f"\nSON HABERLER:\n{news}")
    if dist := sample.get("distractor_context", ""):
        parts.append(f"\nGÜRÜLTÜ VERİSİ (çeldirici):\n{dist}")
    user_msg = "\n".join(parts)

    cot = sample.get("chain_of_thought", "")
    answer_json = json.dumps(sample.get("answer", {}), ensure_ascii=False)
    assistant_msg = f"{cot}\n\n{answer_json}" if cot else answer_json

    return (
        f"<|im_start|>system\n{SYSTEM_PROMPT}<|im_end|>\n"
        f"<|im_start|>user\n{user_msg}<|im_end|>\n"
        f"<|im_start|>assistant\n{assistant_msg}<|im_end|>"
    )


def main(export_gguf: bool = False):
    import torch
    from transformers import (
        AutoModelForCausalLM, AutoTokenizer,
        BitsAndBytesConfig, TrainingArguments,
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from trl import SFTTrainer, SFTConfig
    from datasets import Dataset

    print(f"CUDA: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"VRAM: {vram_gb:.1f} GB")

    # Dataset
    print(f"\nDataset yükleniyor: {DATASET_PATH}")
    raw = load_jsonl(DATASET_PATH)
    print(f"Toplam örnek: {len(raw)}")
    texts = [format_sample(s) for s in raw]
    dataset = Dataset.from_dict({"text": texts})

    # 4-bit quantization config
    bnb_cfg = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    print(f"\nModel yükleniyor: {BASE_MODEL}")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_cfg,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    # LoRA
    lora_cfg = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora_cfg)
    model.print_trainable_parameters()

    # SFTConfig (trl >= 0.8 API)
    sft_cfg = SFTConfig(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=3,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=2e-4,
        warmup_ratio=0.05,
        lr_scheduler_type="cosine",
        fp16=True,
        optim="paged_adamw_8bit",
        logging_steps=10,
        save_steps=100,
        save_total_limit=2,
        max_grad_norm=1.0,
        report_to="none",
        dataloader_num_workers=0,
        max_seq_length=MAX_SEQ_LEN,
        dataset_text_field="text",
        packing=False,
    )

    print("\nEğitim başlıyor...")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=sft_cfg,
    )
    trainer.train()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"\nModel kaydedildi: {OUTPUT_DIR}")

    if export_gguf:
        export_to_gguf()


def export_to_gguf():
    import subprocess, sys, torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel

    print("\nLoRA ağırlıkları merge ediliyor (CPU, yavaş)...")
    base = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL, torch_dtype=torch.float16, device_map="cpu", trust_remote_code=True,
    )
    model = PeftModel.from_pretrained(base, str(OUTPUT_DIR))
    merged = model.merge_and_unload()

    merged_dir = Path("finetuned-qwen-merged")
    merged_dir.mkdir(exist_ok=True)
    merged.save_pretrained(merged_dir, safe_serialization=True)
    AutoTokenizer.from_pretrained(str(OUTPUT_DIR)).save_pretrained(merged_dir)
    print(f"Merge tamamlandı: {merged_dir}")

    # llama.cpp ile GGUF dönüşümü
    script = Path("llama.cpp/convert_hf_to_gguf.py")
    if not script.exists():
        print("\nllama.cpp bulunamadı. Manuel adımlar:")
        print("  git clone https://github.com/ggerganov/llama.cpp")
        print("  pip install -r llama.cpp/requirements.txt")
        print(f"  python llama.cpp/convert_hf_to_gguf.py finetuned-qwen-merged \\")
        print(f"         --outtype q4_k_m --outfile {GGUF_PATH}")
        print(f"\nSonra Ollama'ya yükle:")
        print("  bash ollama_load.sh")
        return

    GGUF_PATH.parent.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, str(script), str(merged_dir),
           "--outtype", "q4_k_m", "--outfile", str(GGUF_PATH)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"\nGGUF hazır: {GGUF_PATH}")
        print("Ollama'ya yükle: bash ollama_load.sh")
    else:
        print(f"GGUF hatası:\n{result.stderr}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--export-gguf", action="store_true")
    args = p.parse_args()
    main(export_gguf=args.export_gguf)
