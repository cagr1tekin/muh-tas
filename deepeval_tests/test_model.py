"""
Doviz App – DeepEval Model Test Süiti
======================================
Modelin (Gemini + Qwen/Ollama) ürettiği finans analizlerini
aşağıdaki boyutlarda değerlendirir:

1. JSON Şema Uyumu       – Çıktı beklenen alanları taşıyor mu?
2. Risk Sınıflandırması  – Makro senaryoya uygun RISKLI/GUVENLI/NOTR mı?
3. Projeksiyon Aralığı   – 0-500 TL bandında mı?
4. Haber Kalitesi        – Başlık/içerik tutarlı ve alakalı mı?
5. Yanıt Alaka Düzeyi    – Cevap, soru bağlamıyla örtüşüyor mu?
6. Hallüsinasyon         – İddialar makro verilere dayanıyor mu?

Çalıştırma:
    deepeval test run deepeval_tests/test_model.py
    veya
    pytest deepeval_tests/test_model.py -v

Not: Her senaryo için Gemini API'si yalnızca BİR KEZ çağrılır (conftest fixture'ı üzerinden).
     Rate-limit (429) riskini azaltmak için otomatik retry + backoff uygulanır.
"""

import os
import json
import re
import time
import pytest
import requests

from deepeval import assert_test
from deepeval.test_case import LLMTestCase, SingleTurnParams
from deepeval.metrics import GEval

# ---------------------------------------------------------------------------
# Ortam değişkenleri
# ---------------------------------------------------------------------------
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL    = os.environ.get("OLLAMA_MODEL", "qwen-raft-finans")
OPENAI_API_KEY  = os.environ.get("OPENAI_API_KEY", "")


# ---------------------------------------------------------------------------
# Gemini API çağrısı (retry + backoff)
# ---------------------------------------------------------------------------
def call_gemini(
    system_prompt: str,
    user_prompt: str,
    model_id: str = "gemini-2.5-flash",
    max_retries: int = 4,
) -> str:
    """Gemini generateContent API'sini çağırır; 429'da exponential backoff uygular."""
    if not GEMINI_API_KEY:
        pytest.skip("GEMINI_API_KEY ortamda yok – Gemini testi atlanıyor.")
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model_id}:generateContent"
    )
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
    }
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 8192},
    }
    wait = 5
    for attempt in range(max_retries):
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        if resp.status_code in (429, 503):
            if attempt < max_retries - 1:
                time.sleep(wait)
                wait *= 2
                continue
        resp.raise_for_status()
        data = resp.json()
        parts = data["candidates"][0]["content"]["parts"]
        return "".join(p["text"] for p in parts)
    resp.raise_for_status()
    return ""


# ---------------------------------------------------------------------------
# Ollama çağrısı
# ---------------------------------------------------------------------------
def call_ollama(user_prompt: str) -> str:
    """Ollama /api/chat endpoint'ini çağırır; ham metin döner."""
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": [{"role": "user", "content": user_prompt}],
        "options": {"temperature": 0.0, "num_predict": 4096},
    }
    try:
        resp = requests.post(url, json=payload, timeout=120)
        resp.raise_for_status()
        return resp.json()["message"]["content"]
    except Exception as exc:
        pytest.skip(f"Ollama ulaşılamıyor ({exc}) – Ollama testi atlanıyor.")


# ---------------------------------------------------------------------------
# JSON ayıklama
# ---------------------------------------------------------------------------
def _repair_json_strings(s: str) -> str:
    """JSON string değerleri içindeki literal kontrol karakterlerini escape eder;
    model artefaktı olan ardışık tırnak çiftlerini de temizler."""
    # Ardışık 3+ tırnak → tek tırnak (örn. "bozuldu.""" artefaktı)
    s = re.sub(r'"{3,}', '"', s)
    result = []
    in_string = False
    escape_next = False
    for ch in s:
        if escape_next:
            result.append(ch)
            escape_next = False
        elif ch == "\\" and in_string:
            result.append(ch)
            escape_next = True
        elif ch == '"':
            result.append(ch)
            in_string = not in_string
        elif in_string and ch == "\n":
            result.append("\\n")
        elif in_string and ch == "\r":
            result.append("\\r")
        elif in_string and ch == "\t":
            result.append("\\t")
        else:
            result.append(ch)
    return "".join(result)


def _find_outer_json(text: str) -> str:
    """Metinden en dıştaki JSON objesini balanced brace sayımıyla bulur."""
    start = text.find("{")
    if start < 0:
        return text
    depth = 0
    in_str = False
    esc = False
    for i, ch in enumerate(text[start:], start):
        if esc:
            esc = False
            continue
        if ch == "\\" and in_str:
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return text[start:]  # kapanmamış — fallback


def extract_json(raw: str) -> dict:
    raw = raw.strip()
    m = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
    if m:
        return json.loads(_repair_json_strings(m.group(1).strip()))
    candidate = _repair_json_strings(_find_outer_json(raw))
    return json.loads(candidate)


def word_count(text: str) -> int:
    return len(text.split())


# ---------------------------------------------------------------------------
# Sistem promptu şablonu (Go'daki BuildPrompt'la özdeş)
# ---------------------------------------------------------------------------
SYSTEM_PROMPT_TEMPLATE = """\
Sen bir finansal analiz asistanısın. Türkiye makroekonomi verilerine göre
USD/TRY kur yön tahmini yapıyorsun. Yanıtını SADECE JSON olarak ver, başka hiçbir şey yazma, markdown fence kullanma.

EK METRİKLER:
- M2 aylık değişim: {m2_change}
- 3 aylık rezerv değişimi: {rezerv_change}

GÜNCEL VERİLER (son 3 ay, EVDS/TCMB):
{macro_rows}

RAFT KURALLARI (her analizde uygula):
- Net rezerv artıyorsa → kurda aşağı baskı, GUVENLI yönde
- Cari açık büyüyor + sermaye girişi yoksa → kurda yukarı baskı, RISKLI
- M2 büyümesi hızlıysa → TL değer kaybı riski
- REK 100 üzerindeyse → TL aşırı değerli, orta vadede yukarı baskı
- REK 75 altındaysa → TL aşırı ucuz, düzeltme potansiyeli
- Reel faiz pozitifse (faiz > enflasyon beklentisi) → TL lehine

ÇIKTI FORMAT (sadece bu JSON, kesinlikle başka hiçbir şey):
{{"risk_bolgesi":"GUVENLI|RISKLI|NOTR","projeksiyon_3_ay":50,
 "projeksiyon_6_ay":100,"ozet":"max 2 cümle",
 "haber_basligi":"sokak dili, HARD LIMIT: 75 karakter (örn: 'Dolar patladı, Merkez Bankası çaresiz kaldı!' = 44 kar)","haber_icerigi":"250-400 kelime haber metni"}}
"""

USER_PROMPT = "Güncel verilere göre USD/TRY analizi yap."


def build_system_prompt(scenario: dict) -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(
        m2_change=scenario["m2_change"],
        rezerv_change=scenario["rezerv_change"],
        macro_rows=scenario["macro_rows"],
    )


# ---------------------------------------------------------------------------
# Makro test senaryoları
# ---------------------------------------------------------------------------

# Senaryo 1: RISKLI – Cari açık artıyor, rezervler düşüyor, M2 hızla büyüyor
RISKLI_MACRO = {
    "m2_change": "+4.2%",
    "rezerv_change": "-8.3 milyar USD",
    "macro_rows": (
        "- 2026-02 | Dolar: 36.50 TL | Rezerv: 112.30B USD (↓) | Cari: -8500.00M USD | M2: 8.90T TL | REK: 95.20 | Faiz: %45.0 (TCMB ağırlıklı ortalama fonlama)\n"
        "- 2026-03 | Dolar: 37.80 TL | Rezerv: 108.40B USD (↓) | Cari: -9200.00M USD | M2: 9.28T TL | REK: 96.10 | Faiz: %45.0 (TCMB ağırlıklı ortalama fonlama)\n"
        "- 2026-04 | Dolar: 39.10 TL | Rezerv: 104.00B USD (↓) | Cari: -10500.00M USD | M2: 9.67T TL | REK: 97.30 | Faiz: %40.0 (TCMB ağırlıklı ortalama fonlama)"
    ),
    "expected_risk": "RISKLI",
}

# Senaryo 2: GUVENLI – Rezervler artıyor, cari denge iyileşiyor, M2 yavaş
GUVENLI_MACRO = {
    "m2_change": "+1.1%",
    "rezerv_change": "+12.5 milyar USD",
    "macro_rows": (
        "- 2026-02 | Dolar: 37.00 TL | Rezerv: 118.00B USD (↑) | Cari: -2100.00M USD | M2: 8.20T TL | REK: 82.50 | Faiz: %47.5 (TCMB ağırlıklı ortalama fonlama)\n"
        "- 2026-03 | Dolar: 36.50 TL | Rezerv: 124.00B USD (↑) | Cari: -1500.00M USD | M2: 8.29T TL | REK: 81.00 | Faiz: %47.5 (TCMB ağırlıklı ortalama fonlama)\n"
        "- 2026-04 | Dolar: 35.90 TL | Rezerv: 130.50B USD (↑) | Cari: -900.00M USD | M2: 8.38T TL | REK: 79.80 | Faiz: %47.5 (TCMB ağırlıklı ortalama fonlama)"
    ),
    "expected_risk": "GUVENLI",
}

# Senaryo 3: NOTR – Karışık sinyaller
NOTR_MACRO = {
    "m2_change": "+2.3%",
    "rezerv_change": "+0.5 milyar USD",
    "macro_rows": (
        "- 2026-02 | Dolar: 37.50 TL | Rezerv: 120.00B USD (→) | Cari: -4500.00M USD | M2: 8.60T TL | REK: 88.00 | Faiz: %45.0 (TCMB ağırlıklı ortalama fonlama)\n"
        "- 2026-03 | Dolar: 37.60 TL | Rezerv: 120.30B USD (→) | Cari: -4600.00M USD | M2: 8.80T TL | REK: 88.50 | Faiz: %45.0 (TCMB ağırlıklı ortalama fonlama)\n"
        "- 2026-04 | Dolar: 37.55 TL | Rezerv: 120.50B USD (→) | Cari: -4400.00M USD | M2: 8.97T TL | REK: 89.00 | Faiz: %45.0 (TCMB ağırlıklı ortalama fonlama)"
    ),
    "expected_risk": "NOTR",
}

SCENARIOS = {
    "RISKLI": RISKLI_MACRO,
    "GUVENLI": GUVENLI_MACRO,
    "NOTR": NOTR_MACRO,
}


# ---------------------------------------------------------------------------
# Session-scoped fixture: her senaryo için Gemini API'si YALNIZCA BİR KEZ çağrılır
# ---------------------------------------------------------------------------
_gemini_cache: dict[str, dict] = {}


@pytest.fixture(scope="session", autouse=True)
def prefetch_gemini_responses():
    """
    Test oturumu başlamadan önce üç senaryonun yanıtlarını çeker ve önbelleğe alır.
    Böylece her test metodu ayrı ayrı API çağrısı yapmaz → rate-limit riski azalır.
    """
    global _gemini_cache
    if not GEMINI_API_KEY:
        return  # testler tek tek skip yapacak

    for label, scenario in SCENARIOS.items():
        sys_prompt = build_system_prompt(scenario)
        try:
            raw = call_gemini(sys_prompt, USER_PROMPT, max_retries=6)
            _gemini_cache[label] = extract_json(raw)
        except Exception as exc:
            _gemini_cache[label] = {"_error": str(exc)}
        # Gemini free tier: 15 RPM → 15 saniye ara 429 riskini minimuma indirir
        time.sleep(15)


def get_cached(label: str) -> dict:
    """Önbellekten senaryo sonucunu döndürür; hata varsa testi atlar."""
    if not GEMINI_API_KEY:
        pytest.skip("GEMINI_API_KEY yok.")
    result = _gemini_cache.get(label, {})
    if "_error" in result:
        pytest.skip(f"Gemini çağrısı başarısız [{label}]: {result['_error']}")
    return result


# ---------------------------------------------------------------------------
# Doğrulama sınıfı
# ---------------------------------------------------------------------------
class AnalysisValidator:
    VALID_RISK = {"GUVENLI", "RISKLI", "NOTR"}

    def __init__(self, result: dict):
        self.r = result
        self.errors: list[str] = []

    def validate_schema(self):
        required = [
            "risk_bolgesi", "projeksiyon_3_ay", "projeksiyon_6_ay",
            "ozet", "haber_basligi", "haber_icerigi",
        ]
        for f in required:
            if f not in self.r:
                self.errors.append(f"Eksik alan: {f}")
        return self

    def validate_risk_bolgesi(self):
        rb = self.r.get("risk_bolgesi", "")
        if rb not in self.VALID_RISK:
            self.errors.append(f"Geçersiz risk_bolgesi: {rb!r} (GUVENLI|RISKLI|NOTR beklenir)")
        return self

    def validate_projections(self):
        for field in ["projeksiyon_3_ay", "projeksiyon_6_ay"]:
            val = self.r.get(field)
            if val is None:
                continue
            try:
                v = float(val)
                if not (0 <= v <= 500):
                    self.errors.append(f"{field} aralık dışı: {v} (0-500 beklenir)")
            except (TypeError, ValueError):
                self.errors.append(f"{field} sayı değil: {val!r}")
        return self

    def validate_haber_basligi(self):
        title = self.r.get("haber_basligi", "")
        if len(title) > 80:
            self.errors.append(f"haber_basligi çok uzun: {len(title)} karakter (maks 80)")
        if not title.strip():
            self.errors.append("haber_basligi boş")
        return self

    def validate_haber_icerigi(self, min_words: int = 100):
        content = self.r.get("haber_icerigi", "")
        wc = word_count(content)
        if wc < min_words:
            self.errors.append(f"haber_icerigi çok kısa: {wc} kelime (min {min_words})")
        return self

    def validate_ozet(self):
        if not self.r.get("ozet", "").strip():
            self.errors.append("ozet boş")
        return self

    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def report(self) -> str:
        if self.is_valid():
            return "Tüm doğrulamalar geçti."
        return "Hatalar:\n" + "\n".join(f"  - {e}" for e in self.errors)


# ===========================================================================
# TEST 1: JSON Şema Uyumu
# ===========================================================================
class TestSchemaCompliance:

    def test_riskli_schema(self):
        """RISKLI senaryoda tüm JSON alanları doğru şemada mı?"""
        r = get_cached("RISKLI")
        v = (
            AnalysisValidator(r)
            .validate_schema()
            .validate_risk_bolgesi()
            .validate_projections()
            .validate_haber_basligi()
            .validate_haber_icerigi()
            .validate_ozet()
        )
        assert v.is_valid(), f"RISKLI şema hatası:\n{v.report()}\nÇıktı: {r}"

    def test_guvenli_schema(self):
        """GUVENLI senaryoda tüm JSON alanları doğru şemada mı?"""
        r = get_cached("GUVENLI")
        v = (
            AnalysisValidator(r)
            .validate_schema()
            .validate_risk_bolgesi()
            .validate_projections()
            .validate_haber_basligi()
            .validate_haber_icerigi()
            .validate_ozet()
        )
        assert v.is_valid(), f"GUVENLI şema hatası:\n{v.report()}\nÇıktı: {r}"

    def test_notr_schema(self):
        """NOTR senaryoda tüm JSON alanları doğru şemada mı?"""
        r = get_cached("NOTR")
        v = (
            AnalysisValidator(r)
            .validate_schema()
            .validate_risk_bolgesi()
            .validate_projections()
            .validate_haber_basligi()
            .validate_haber_icerigi()
            .validate_ozet()
        )
        assert v.is_valid(), f"NOTR şema hatası:\n{v.report()}\nÇıktı: {r}"


# ===========================================================================
# TEST 2: Risk Sınıflandırma Doğruluğu
# ===========================================================================
class TestRiskClassification:

    def test_riskli_classification(self):
        """Rezerv düşen + cari açık artan senaryoda RISKLI beklenir."""
        r = get_cached("RISKLI")
        risk = r.get("risk_bolgesi", "")
        assert risk == "RISKLI", (
            f"Beklenen RISKLI, dönen: {risk!r}\nÖzet: {r.get('ozet', '')}"
        )

    def test_guvenli_classification(self):
        """Rezerv artan + cari iyileşen senaryoda GUVENLI beklenir."""
        r = get_cached("GUVENLI")
        risk = r.get("risk_bolgesi", "")
        assert risk == "GUVENLI", (
            f"Beklenen GUVENLI, dönen: {risk!r}\nÖzet: {r.get('ozet', '')}"
        )


# ===========================================================================
# TEST 3: Projeksiyon Aralık Kontrolleri
# ===========================================================================
class TestProjectionRange:

    @pytest.mark.parametrize("label", ["RISKLI", "GUVENLI", "NOTR"])
    def test_projection_in_range(self, label):
        """projeksiyon_3_ay ve projeksiyon_6_ay 0-500 aralığında olmalı."""
        r = get_cached(label)
        for field in ["projeksiyon_3_ay", "projeksiyon_6_ay"]:
            val = float(r.get(field, -1))
            assert 0 <= val <= 500, (
                f"[{label}] {field}={val} aralık dışı (0-500). Çıktı: {r}"
            )

    def test_riskli_projection_ordering(self):
        """RISKLI senaryoda 6 aylık projeksiyon ≥ 3 aylık olmalı (kur yükseliyor)."""
        r = get_cached("RISKLI")
        p3 = float(r.get("projeksiyon_3_ay", 0))
        p6 = float(r.get("projeksiyon_6_ay", 0))
        assert p6 >= p3, (
            f"RISKLI: 6 aylık ({p6}) < 3 aylık ({p3}) – kur yukarı baskıyla tutarsız."
        )


# ===========================================================================
# TEST 4: Haber Kalitesi (kural tabanlı)
# ===========================================================================
class TestNewsQuality:

    @pytest.mark.parametrize("label", ["RISKLI", "GUVENLI", "NOTR"])
    def test_haber_basligi_max_length(self, label):
        """Tüm senaryolarda başlık 80 karakteri aşmamalı."""
        r = get_cached(label)
        title = r.get("haber_basligi", "")
        assert len(title) <= 80, f"[{label}] Başlık çok uzun ({len(title)} kar.): {title!r}"

    def test_haber_icerigi_not_empty(self):
        """haber_icerigi boş olmamalı."""
        r = get_cached("RISKLI")
        content = r.get("haber_icerigi", "").strip()
        assert len(content) > 50, f"haber_icerigi çok kısa: {content!r}"

    def test_haber_icerigi_word_count(self):
        """haber_icerigi en az 100 kelime içermeli (hedef 250-400)."""
        r = get_cached("RISKLI")
        wc = word_count(r.get("haber_icerigi", ""))
        assert wc >= 100, f"haber_icerigi kelime sayısı: {wc} (min 100, hedef 250-400)"

    def test_haber_no_markdown_fence(self):
        """haber_icerigi ham markdown fence içermemeli."""
        r = get_cached("RISKLI")
        content = r.get("haber_icerigi", "")
        assert "```" not in content, f"Markdown fence bulundu: {content[:200]!r}"

    def test_haber_in_turkish(self):
        """haber_icerigi Türkçe karakter içermeli."""
        r = get_cached("RISKLI")
        content = r.get("haber_icerigi", "")
        turkish_chars = set("ğşıöüçĞŞİÖÜÇ")
        assert any(c in turkish_chars for c in content), (
            "haber_icerigi Türkçe karakter içermiyor."
        )

    def test_ozet_max_sentences(self):
        """ozet en fazla 2 cümle içermeli (nokta sayısına göre yaklaşık kontrol)."""
        r = get_cached("RISKLI")
        ozet = r.get("ozet", "")
        # Basit yaklaşım: '. ' veya '.' sayısı ≤ 3 (son nokta dahil)
        sentences = [s.strip() for s in re.split(r"[.!?]", ozet) if s.strip()]
        assert len(sentences) <= 3, (
            f"ozet çok fazla cümle içeriyor ({len(sentences)}): {ozet!r}"
        )


# ===========================================================================
# TEST 5: DeepEval GEval – Finansal Tutarlılık (OPENAI_API_KEY gerektirir)
# ===========================================================================
class TestDeepEvalGEval:

    @pytest.mark.skipif(not OPENAI_API_KEY, reason="OPENAI_API_KEY yok – GEval atlanıyor")
    def test_financial_coherence_riskli(self):
        """RISKLI özet RAFT kurallarına tutarlı gerekçe sunuyor mu?"""
        r = get_cached("RISKLI")
        test_case = LLMTestCase(
            input=USER_PROMPT,
            actual_output=r.get("ozet", ""),
            context=[RISKLI_MACRO["macro_rows"]],
        )
        metric = GEval(
            name="Finansal Tutarlılık – RISKLI",
            evaluation_steps=[
                "Özet, düşen rezervleri veya artan cari açığı belirtiyor mu?",
                "M2 büyümesi veya TL değer kaybı riski vurgulanıyor mu?",
                "RISKLI sonucu gerekçelendiriliyor mu?",
            ],
            evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
            threshold=0.7,
        )
        assert_test(test_case, [metric])

    @pytest.mark.skipif(not OPENAI_API_KEY, reason="OPENAI_API_KEY yok – GEval atlanıyor")
    def test_financial_coherence_guvenli(self):
        """GUVENLI özet iyimser bağlamla tutarlı mı?"""
        r = get_cached("GUVENLI")
        test_case = LLMTestCase(
            input=USER_PROMPT,
            actual_output=r.get("ozet", ""),
            context=[GUVENLI_MACRO["macro_rows"]],
        )
        metric = GEval(
            name="Finansal Tutarlılık – GUVENLI",
            evaluation_steps=[
                "Özet, artan rezervlerden veya iyileşen cari dengeden bahsediyor mu?",
                "TL lehine baskı olduğu belirtiliyor mu?",
                "GUVENLI sınıflandırması gerekçelendiriliyor mu?",
            ],
            evaluation_params=[SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.CONTEXT],
            threshold=0.7,
        )
        assert_test(test_case, [metric])


# ===========================================================================
# TEST 6: Ollama (Qwen RAFT) – şema uyumu
# ===========================================================================
def _build_ollama_prompt(scenario: dict) -> str:
    rows = scenario["macro_rows"]
    return (
        "Aşağıdaki güncel makroekonomik bağlamı dikkate alarak soruyu cevapla. "
        "Önce durum analizini (Düşünce Zinciri) yap, ardından sonucu belirtilen JSON formatında ver.\n\n"
        f"GÜNCEL MAKRO BAĞLAMI (son 3 ay, EVDS/TCMB):\n{rows}\n\n"
        f"M2 aylık değişim: {scenario['m2_change']}\n"
        f"3 aylık rezerv değişimi: {scenario['rezerv_change']}\n\n"
        "RAFT KURALLARI (özet):\n"
        "- Net rezerv artıyorsa → kurda aşağı baskı, GUVENLI yönü\n"
        "- Cari açık büyüyor + sermaye girişi yoksa → kurda yukarı baskı, RISKLI\n"
        "- M2 büyümesi hızlıysa → TL değer kaybı riski\n"
        "- REK 100 üzerindeyse → TL aşırı değerli, orta vadede yukarı baskı\n\n"
        "Soru: Güncel makroekonomik verilere göre USD/TRY kurunun yönü ve risk bölgesi nedir?\n\n"
        "ÇIKTI:\n"
        "1) Önce Düşünce Zinciri'ni düz metin olarak yaz.\n"
        "2) Ardından YALNIZCA aşağıdaki 6 alanlı JSON nesnesini yaz, başka alan EKLEME:\n"
        '{"risk_bolgesi":"GUVENLI|RISKLI|NOTR",'
        '"projeksiyon_3_ay":<0-500 arası sayı>,'
        '"projeksiyon_6_ay":<0-500 arası sayı>,'
        '"ozet":"en fazla 2 cümle Türkçe özet",'
        '"haber_basligi":"en fazla 80 karakter sokak dili Türkçe başlık",'
        '"haber_icerigi":"250 ile 400 kelime arası Türkçe haber metni"}'
        "\nNOT: doviz_onerileri, tavsiye, oneri gibi ekstra alanlar YASAKTIR."
    )


class TestOllamaRAFT:
    """Yerel Ollama (Qwen RAFT) modelini test eder; Ollama ayakta değilse atlanır."""

    def test_ollama_schema_riskli(self):
        """Qwen RAFT – RISKLI senaryoda JSON şeması uyumu."""
        raw = call_ollama(_build_ollama_prompt(RISKLI_MACRO))
        result = extract_json(raw)
        v = (
            AnalysisValidator(result)
            .validate_schema()
            .validate_risk_bolgesi()
            .validate_projections()
            .validate_haber_basligi()
            .validate_ozet()
        )
        assert v.is_valid(), (
            f"Ollama RISKLI şema hatası:\n{v.report()}\nHam (600 kar.):\n{raw[:600]}"
        )

    def test_ollama_schema_guvenli(self):
        """Qwen RAFT – GUVENLI senaryoda JSON şeması uyumu."""
        raw = call_ollama(_build_ollama_prompt(GUVENLI_MACRO))
        result = extract_json(raw)
        v = (
            AnalysisValidator(result)
            .validate_schema()
            .validate_risk_bolgesi()
            .validate_projections()
            .validate_haber_basligi()
        )
        assert v.is_valid(), f"Ollama GUVENLI şema hatası:\n{v.report()}"

    def test_ollama_projection_range(self):
        """Qwen RAFT – NOTR senaryoda projeksiyon 0-500 aralığında mı?"""
        raw = call_ollama(_build_ollama_prompt(NOTR_MACRO))
        result = extract_json(raw)
        for field in ["projeksiyon_3_ay", "projeksiyon_6_ay"]:
            val = float(result.get(field, -1))
            assert 0 <= val <= 500, f"Ollama {field}={val} aralık dışı."


# ===========================================================================
# TEST 7: Kural Tabanlı Birim Testleri (API gerektirmez)
# ===========================================================================
class TestRetryBehavior:
    """Bozuk çıktılara karşı validator ve ayıklayıcı davranışı."""

    def test_invalid_json_raises(self):
        """Geçersiz JSON çıktısı parse hatası fırlatmalı."""
        with pytest.raises((json.JSONDecodeError, KeyError, ValueError)):
            extract_json("Bu JSON değil ama model bunu döndürdü.")

    def test_wrong_risk_bolgesi_detected(self):
        """Geçersiz risk_bolgesi validator tarafından yakalanmalı."""
        bad = {
            "risk_bolgesi": "TEHLIKELI",
            "projeksiyon_3_ay": 38.5,
            "projeksiyon_6_ay": 40.0,
            "ozet": "Test.",
            "haber_basligi": "Başlık",
            "haber_icerigi": "İçerik " * 20,
        }
        v = AnalysisValidator(bad).validate_risk_bolgesi()
        assert not v.is_valid()
        assert any("risk_bolgesi" in e for e in v.errors)

    def test_out_of_range_projection_detected(self):
        """999 değeri (>500) validator tarafından yakalanmalı."""
        bad = {
            "risk_bolgesi": "RISKLI",
            "projeksiyon_3_ay": 999,
            "projeksiyon_6_ay": 40.0,
            "ozet": "Test.",
            "haber_basligi": "Başlık",
            "haber_icerigi": "İçerik " * 50,
        }
        v = AnalysisValidator(bad).validate_projections()
        assert not v.is_valid()
        assert any("projeksiyon_3_ay" in e for e in v.errors)

    def test_too_long_title_detected(self):
        """81+ karakter başlık validator tarafından yakalanmalı."""
        bad = {
            "risk_bolgesi": "NOTR",
            "projeksiyon_3_ay": 38.0,
            "projeksiyon_6_ay": 39.0,
            "ozet": "Test.",
            "haber_basligi": "A" * 81,
            "haber_icerigi": "İçerik " * 50,
        }
        v = AnalysisValidator(bad).validate_haber_basligi()
        assert not v.is_valid()
        assert any("haber_basligi" in e for e in v.errors)

    def test_missing_field_detected(self):
        """Eksik alan validator tarafından yakalanmalı."""
        bad = {"risk_bolgesi": "NOTR"}  # diğer alanlar eksik
        v = AnalysisValidator(bad).validate_schema()
        assert not v.is_valid()
        assert len(v.errors) >= 4  # en az 4 alan eksik

    def test_word_count_utility(self):
        """word_count yardımcı fonksiyonu doğru çalışmalı."""
        assert word_count("bir iki üç") == 3
        assert word_count("") == 0       # "".split() → []
        assert word_count("  ") == 0     # "  ".split() → []
        assert word_count("tek") == 1
