package raft

import (
	"bytes"
	"fmt"
	"math"
	"sort"
	"strings"
	"text/template"
	"time"

	"finans-test/internal/datasource"
)

// macroPromptLine, Gemini system şablonu ve Ollama user metni için ortak satır biçimi.
type macroPromptLine struct {
	Tarih string
	Dolar string
	Rez   string
	Trend string
	Cari  string
	M2    string
	REK   string
	Faiz  string
}

// macroPromptFromRecords son 3 ay + ek metrikleri üretir (Gemini ve Ollama aynı kaynağı kullanır).
func macroPromptFromRecords(records []datasource.MacroRecord) (lines []macroPromptLine, m2ChangeStr, rezervChangeStr string, latest datasource.MacroRecord, rezervDiv float64, ok bool) {
	type dated struct {
		rec  datasource.MacroRecord
		when time.Time
	}

	datedRecords := make([]dated, 0, len(records))
	for _, r := range records {
		when := parseTarihMonth(r.Tarih)
		datedRecords = append(datedRecords, dated{rec: r, when: when})
	}

	sort.Slice(datedRecords, func(i, j int) bool {
		return datedRecords[i].when.Before(datedRecords[j].when)
	})

	if len(datedRecords) == 0 {
		return nil, "veri mevcut değil", "veri mevcut değil", datasource.MacroRecord{}, 1_000_000_000, false
	}

	start := 0
	if len(datedRecords) > 3 {
		start = len(datedRecords) - 3
	}
	last3 := datedRecords[start:]

	rezervDiv = float64(1_000_000_000)
	if len(last3) > 0 {
		latestRaw := last3[len(last3)-1].rec.Rezervler
		fmt.Printf("[prompt_builder] Rezervler ham değer (raw): %.3f\n", latestRaw)
		if latestRaw != 0 && !math.IsNaN(latestRaw) {
			scaled1 := latestRaw / 1_000_000_000
			scaled2 := latestRaw / 100_000_000

			if scaled1 < 50 && scaled2 >= 50 && scaled2 <= 200 {
				rezervDiv = 100_000_000
			}

			fmt.Printf("[prompt_builder] Rezervler scaled: /1e9=%.2fB USD, /1e8=%.2fB USD, seçilen div=%.0f\n", scaled1, scaled2, rezervDiv)
		}
	}

	lines = make([]macroPromptLine, 0, len(last3))
	var prev *datasource.MacroRecord
	if start-1 >= 0 && len(datedRecords) >= 4 {
		prevCopy := datedRecords[start-1].rec
		prev = &prevCopy
	}
	for i := range last3 {
		rec := last3[i].rec
		trend := "→"
		if prev != nil {
			trend = trendFromRezervArrow(*prev, rec)
		}

		lines = append(lines, macroPromptLine{
			Tarih: rec.Tarih,
			Dolar: formatOrMissing(rec.DolarKuru, 2, ""),
			Rez:   formatOrMissingScaled(rec.Rezervler, rezervDiv, 2, "veri mevcut değil "),
			Trend: trend,
			Cari:  formatOrMissingScaled(rec.CariDenge, 1_000_000, 2, "veri mevcut değil "),
			M2:    formatOrMissingScaled(rec.M2ParaArzi, 1_000_000_000_000, 2, "veri mevcut değil "),
			REK:   formatOrMissing(rec.ReelEfektifKur, 2, "veri mevcut değil"),
			Faiz:  formatFaiz(rec.PolitikaFaizi),
		})

		prevCopy := rec
		prev = &prevCopy
	}

	m2ChangeStr = "veri mevcut değil"
	rezervChangeStr = "veri mevcut değil"

	if len(last3) >= 2 {
		latestRec := last3[len(last3)-1].rec
		prevM2 := last3[len(last3)-2].rec
		if latestRec.M2ParaArzi != 0 && prevM2.M2ParaArzi != 0 {
			pct := (latestRec.M2ParaArzi - prevM2.M2ParaArzi) / prevM2.M2ParaArzi * 100.0
			if !math.IsNaN(pct) && !math.IsInf(pct, 0) {
				m2ChangeStr = fmt.Sprintf("%.1f%%", pct)
			}
		}
	}

	if len(last3) >= 3 {
		latestRec := last3[len(last3)-1].rec
		old := last3[0].rec
		if latestRec.Rezervler != 0 && old.Rezervler != 0 {
			deltaB := (latestRec.Rezervler - old.Rezervler) / 1_000_000_000
			if !math.IsNaN(deltaB) && !math.IsInf(deltaB, 0) {
				rezervChangeStr = fmt.Sprintf("%+.1f milyar USD", deltaB)
			}
		}
	}

	latest = last3[len(last3)-1].rec
	return lines, m2ChangeStr, rezervChangeStr, latest, rezervDiv, true
}

// BuildPrompt, RAFT kurallarına uygun system prompt + sabit user prompt üretir.
func BuildPrompt(records []datasource.MacroRecord) (systemPrompt string, userPrompt string) {
	promptRecs, m2ChangeStr, rezervChangeStr, _, _, ok := macroPromptFromRecords(records)
	if !ok {
		return "", "Güncel verilere göre USD/TRY analizi yap."
	}

	// System prompt: plan metnini birebir uygulayacak şekilde güncellendi.
	const systemTemplate = `Sen bir finansal analiz asistanısın. Türkiye makroekonomi verilerine göre
USD/TRY kur yön tahmini yapıyorsun. Yanıtını SADECE JSON olarak ver, başka hiçbir şey yazma, markdown fence kullanma.

EK METRİKLER:
- M2 aylık değişim: {{.M2Change}}
- 3 aylık rezerv değişimi: {{.RezervChange}}

GÜNCEL VERİLER (son 3 ay, EVDS/TCMB):
{{range .Data}}- {{.Tarih}} | Dolar: {{.Dolar}} TL | Rezerv: {{.Rez}}B USD ({{.Trend}}) | Cari: {{.Cari}}M USD | M2: {{.M2}}T TL | REK: {{.REK}} | Faiz: {{.Faiz}}
{{end}}

RAFT KURALLARI (her analizde uygula):
- Net rezerv artıyorsa → kurda aşağı baskı, GUVENLI yönde
- Cari açık büyüyor + sermaye girişi yoksa → kurda yukarı baskı, RISKLI
- M2 büyümesi hızlıysa → TL değer kaybı riski
- REK 100 üzerindeyse → TL aşırı değerli, orta vadede yukarı baskı
- REK 75 altındaysa → TL aşırı ucuz, düzeltme potansiyeli
- Reel faiz pozitifse (faiz > enflasyon beklentisi) → TL lehine

ÇIKTI FORMAT (sadece bu JSON, kesinlikle başka hiçbir şey):
{"risk_bolgesi":"GUVENLI|RISKLI|NOTR","projeksiyon_3_ay":50,
 "projeksiyon_6_ay":100,"ozet":"max 2 cümle",
 "haber_basligi":"sokak dili max 80 karakter","haber_icerigi":"250-400 kelime haber metni"}`

	tpl, err := template.New("system").Parse(systemTemplate)
	if err != nil {
		return "", "Güncel verilere göre USD/TRY analizi yap."
	}

	buf := new(bytes.Buffer)
	_ = tpl.Execute(buf, map[string]any{
		"Data":         promptRecs,
		"M2Change":     m2ChangeStr,
		"RezervChange": rezervChangeStr,
	})
	systemPrompt = strings.TrimSpace(buf.String())
	userPrompt = "Güncel verilere göre USD/TRY analizi yap."
	return systemPrompt, userPrompt
}

func trendFromRezervArrow(prev, curr datasource.MacroRecord) string {
	p := prev.Rezervler
	c := curr.Rezervler
	if p == 0 || c == 0 {
		return "→"
	}
	changePct := (c - p) / math.Abs(p) * 100.0
	if math.Abs(changePct) <= 1.0 {
		return "→"
	}
	if changePct > 1.0 {
		return "↑"
	}
	return "↓"
}

func formatOrMissing(val float64, decimals int, missing string) string {
	if val == 0 || math.IsNaN(val) {
		if missing == "" {
			return "veri mevcut değil"
		}
		return missing
	}
	return fmt.Sprintf("%.*f", decimals, val)
}

func formatOrMissingScaled(val float64, div float64, decimals int, missing string) string {
	if val == 0 || math.IsNaN(val) {
		return missing
	}
	scaled := val / div
	// Eksik davranışı önlemek için yine sayıyı yuvarlayıp döndürüyoruz.
	if math.IsNaN(scaled) || math.IsInf(scaled, 0) {
		return missing
	}
	return fmt.Sprintf("%.*f", decimals, scaled)
}

// Politika faizi: 0/nan gelirse "veri yok", aksi halde yüzde ve açıklama ekle.
func formatFaiz(val float64) string {
	if val <= 0 || math.IsNaN(val) {
		return "veri yok"
	}
	return fmt.Sprintf("%%%.1f (TCMB ağırlıklı ortalama fonlama)", val)
}

func parseTarihMonth(s string) time.Time {
	// Beklenen örnekler:
	// - "2026-03-01"
	// - "2026-3"
	parts := strings.Split(s, "-")
	if len(parts) < 2 {
		return time.Time{}
	}

	year := 0
	month := 0
	if _, err := fmt.Sscanf(parts[0], "%d", &year); err != nil {
		return time.Time{}
	}
	if _, err := fmt.Sscanf(parts[1], "%d", &month); err != nil {
		return time.Time{}
	}
	if year == 0 || month < 1 || month > 12 {
		return time.Time{}
	}
	return time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
}

