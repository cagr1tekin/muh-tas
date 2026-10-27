# Doviz App – DeepEval Test Çalıştırıcı
# Kullanım: .\run_tests.ps1 [-GeminiKey "API_KEY"] [-OpenAIKey "API_KEY"] [-OllamaModel "qwen-raft-finans"]

param(
    [string]$GeminiKey  = $env:GEMINI_API_KEY,
    [string]$OpenAIKey  = $env:OPENAI_API_KEY,
    [string]$OllamaModel = "qwen-raft-finans",
    [string]$OllamaBase  = "http://127.0.0.1:11434",
    [switch]$SkipOllama,
    [switch]$Verbose
)

Write-Host "`n=== Doviz App – DeepEval Model Testleri ===" -ForegroundColor Cyan

# Ortam değişkenlerini set et
if ($GeminiKey) { $env:GEMINI_API_KEY = $GeminiKey }
if ($OpenAIKey)  { $env:OPENAI_API_KEY  = $OpenAIKey }
$env:OLLAMA_MODEL    = $OllamaModel
$env:OLLAMA_BASE_URL = $OllamaBase

# Mevcut anahtarları göster
$geminiOk = if ($env:GEMINI_API_KEY) { "✓ SET" } else { "✗ EKSİK (Gemini testleri atlanacak)" }
$openaiOk = if ($env:OPENAI_API_KEY) { "✓ SET" } else { "✗ EKSİK (GEval metrikleri atlanacak)" }
Write-Host "GEMINI_API_KEY : $geminiOk"
Write-Host "OPENAI_API_KEY : $openaiOk"
Write-Host "OLLAMA_MODEL   : $OllamaModel"
Write-Host "OLLAMA_BASE_URL: $OllamaBase`n"

# Test komutunu oluştur
$testDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$testFile = Join-Path $testDir "test_model.py"

$pytestArgs = @($testFile, "--tb=short", "--no-header", "-rA")

if ($SkipOllama) {
    $pytestArgs += @("-k", "not Ollama")
    Write-Host "Ollama testleri atlanıyor (-SkipOllama)."
}

if ($Verbose) {
    $pytestArgs += "-v"
}

# Çalıştır
Write-Host "Çalıştırılıyor: pytest $($pytestArgs -join ' ')`n" -ForegroundColor Yellow
python -m pytest @pytestArgs

$exitCode = $LASTEXITCODE
if ($exitCode -eq 0) {
    Write-Host "`n✓ Tüm testler geçti." -ForegroundColor Green
} else {
    Write-Host "`n✗ Bazı testler başarısız. Çıkış kodu: $exitCode" -ForegroundColor Red
}

exit $exitCode
