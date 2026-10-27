package raft

import (
	"bytes"
	"fmt"
	"math"
	"sort"
	"strings"
	"text/template"
	"time"

	"finans-backend/internal/datasource"
)

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

// macroPromptFromRecords son 3 ay + ek metrikleri hesaplar.
func macroPromptFromRecords(records []datasource.MacroRecord) (
	lines []macroPromptLine,
	m2ChangeStr, rezervChangeStr string,
	latest datasource.MacroRecord,
	rezervDiv float64,
	ok bool,
) {
	type dated struct {
		rec  datasource.MacroRecord
		when time.Time
	}

	dated_ := make([]dated, 0, len(records))
	for _, r := range records {
		dated_ = append(dated_, dated{rec: r, when: parseTarihMonth(r.Tarih)})
	}
	sort.Slice(dated_, func(i, j int) bool { return dated_[i].when.Before(dated_[j].when) })

	if len(dated_) == 0 {
		return nil, "veri mevcut değil", "veri mevcut değil", datasource.MacroRecord{}, 1_000_000_000, false
	}

	start := 0
	if len(dated_) > 3 {
		start = len(dated_) - 3
	}
	last3 := dated_[start:]

	rezervDiv = 1_000_000_000
	if len(last3) > 0 {
		raw := last3[len(last3)-1].rec.Rezervler
		if raw != 0 && !math.IsNaN(raw) {
			scaled2 := raw / 100_000_000
			if raw/1_000_000_000 < 50 && scaled2 >= 50 && scaled2 <= 200 {
				rezervDiv = 100_000_000
			}
		}
	}

	var prev *datasource.MacroRecord
	if start-1 >= 0 && len(dated_) >= 4 {
		cp := dated_[start-1].rec
		prev = &cp
	}

	lines = make([]macroPromptLine, 0, len(last3))
	for i := range last3 {
		rec := last3[i].rec
		trend := "→"
		if prev != nil {
			trend = reservTrend(*prev, rec)
		}
		lines = append(lines, macroPromptLine{
			Tarih: rec.Tarih,
			Dolar: formatVal(rec.DolarKuru, 2),
			Rez:   formatScaled(rec.Rezervler, rezervDiv, 2),
			Trend: trend,
			Cari:  formatScaled(rec.CariDenge, 1_000_000, 2),
			M2:    formatScaled(rec.M2ParaArzi, 1_000_000_000_000, 2),
			REK:   formatVal(rec.ReelEfektifKur, 2),
			Faiz:  formatFaiz(rec.PolitikaFaizi),
		})
		cp := rec
		prev = &cp
	}

	m2ChangeStr = "veri mevcut değil"
	rezervChangeStr = "veri mevcut değil"

	if len(last3) >= 2 {
		l := last3[len(last3)-1].rec
		p := last3[len(last3)-2].rec
		if l.M2ParaArzi != 0 && p.M2ParaArzi != 0 {
			pct := (l.M2ParaArzi - p.M2ParaArzi) / p.M2ParaArzi * 100.0
			if !math.IsNaN(pct) && !math.IsInf(pct, 0) {
				m2ChangeStr = fmt.Sprintf("%.1f%%", pct)
			}
		}
	}

	if len(last3) >= 3 {
		l := last3[len(last3)-1].rec
		o := last3[0].rec
		if l.Rezervler != 0 && o.Rezervler != 0 {
			deltaB := (l.Rezervler - o.Rezervler) / 1_000_000_000
			if !math.IsNaN(deltaB) && !math.IsInf(deltaB, 0) {
				rezervChangeStr = fmt.Sprintf("%+.1f milyar USD", deltaB)
			}
		}
	}

	latest = last3[len(last3)-1].rec
	return lines, m2ChangeStr, rezervChangeStr, latest, rezervDiv, true
}

// BuildSystemPrompt RAFT kurallarına uygun Gemini system prompt üretir.
func BuildSystemPrompt(records []datasource.MacroRecord) string {
	promptRecs, m2Change, rezervChange, _, _, ok := macroPromptFromRecords(records)
	if !ok {
		return ""
	}

	const tmpl = `Sen bir finansal analiz asistanısın. Türkiye makroekonomi verilerine göre
USD/TRY kur yön tahmini yapıyorsun. Yanıtını SADECE JSON olarak ver, başka hiçbir şey yazma.

EK METRİKLER:
- M2 aylık değişim: {{.M2Change}}
- 3 aylık rezerv değişimi: {{.RezervChange}}

GÜNCEL VERİLER (son 3 ay, EVDS/TCMB):
{{range .Data}}- {{.Tarih}} | Dolar: {{.Dolar}} TL | Rezerv: {{.Rez}}B USD ({{.Trend}}) | Cari: {{.Cari}}M USD | M2: {{.M2}}T TL | REK: {{.REK}} | Faiz: {{.Faiz}}
{{end}}

RAFT KURALLARI:
- Net rezerv artıyorsa → kurda aşağı baskı, GUVENLI
- Cari açık büyüyor + sermaye girişi yoksa → kurda yukarı baskı, RISKLI
- M2 büyümesi hızlıysa → TL değer kaybı riski
- REK 100 üzerindeyse → TL aşırı değerli
- REK 75 altındaysa → TL aşırı ucuz
- Reel faiz pozitifse → TL lehine

ÇIKTI FORMAT (yalnızca JSON):
{"risk_bolgesi":"GUVENLI|RISKLI|NOTR","projeksiyon_3_ay":50,"projeksiyon_6_ay":100,"ozet":"max 2 cümle","haber_basligi":"max 80 karakter","haber_icerigi":"250-400 kelime"}`

	t, err := template.New("sys").Parse(tmpl)
	if err != nil {
		return ""
	}
	buf := new(bytes.Buffer)
	_ = t.Execute(buf, map[string]any{
		"Data":         promptRecs,
		"M2Change":     m2Change,
		"RezervChange": rezervChange,
	})
	return strings.TrimSpace(buf.String())
}

func reservTrend(prev, curr datasource.MacroRecord) string {
	if prev.Rezervler == 0 || curr.Rezervler == 0 {
		return "→"
	}
	pct := (curr.Rezervler - prev.Rezervler) / math.Abs(prev.Rezervler) * 100.0
	if math.Abs(pct) <= 1.0 {
		return "→"
	}
	if pct > 1.0 {
		return "↑"
	}
	return "↓"
}

func formatVal(val float64, decimals int) string {
	if val == 0 || math.IsNaN(val) {
		return "veri mevcut değil"
	}
	return fmt.Sprintf("%.*f", decimals, val)
}

func formatScaled(val, div float64, decimals int) string {
	if val == 0 || math.IsNaN(val) || div == 0 {
		return "veri mevcut değil"
	}
	scaled := val / div
	if math.IsNaN(scaled) || math.IsInf(scaled, 0) {
		return "veri mevcut değil"
	}
	return fmt.Sprintf("%.*f", decimals, scaled)
}

func formatFaiz(val float64) string {
	if val <= 0 || math.IsNaN(val) {
		return "veri yok"
	}
	return fmt.Sprintf("%%%.1f (TCMB ağırlıklı ortalama fonlama)", val)
}

func parseTarihMonth(s string) time.Time {
	parts := strings.Split(s, "-")
	if len(parts) < 2 {
		return time.Time{}
	}
	var year, month int
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
