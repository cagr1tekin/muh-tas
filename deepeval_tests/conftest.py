"""
pytest conftest – DeepEval entegrasyonu için genel ayarlar.
"""

import os
import pytest


def pytest_configure(config):
    """DeepEval için gerekli ortam değişkenlerini doğrula."""
    missing = []
    if not os.environ.get("GEMINI_API_KEY"):
        missing.append("GEMINI_API_KEY")
    if missing:
        print(
            f"\n[UYARI] Şu ortam değişkenleri eksik: {', '.join(missing)}\n"
            "  API çağrısı gerektiren testler atlanacak.\n"
            "  LLM tabanlı metrikler için OPENAI_API_KEY de gereklidir.\n"
        )


def pytest_collection_modifyitems(config, items):
    """Test süresini azaltmak için slow işaretli testleri sona taşı."""
    slow_tests = []
    fast_tests = []
    for item in items:
        if "ollama" in item.nodeid.lower():
            slow_tests.append(item)
        else:
            fast_tests.append(item)
    items[:] = fast_tests + slow_tests
