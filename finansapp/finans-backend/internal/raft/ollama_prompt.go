package raft

import (
	"fmt"
	"hash/fnv"
	"math"
	"strings"

	"finans-backend/internal/datasource"
)

// PromptPortfolioItem portföydeki bir döviz pozisyonunu prompt için özetler.
type PromptPortfolioItem struct {
	DovizKodu string
	Miktar    float64
	AlisKuru  float64 // TL cinsinden
	AnlikKur  float64 // TL cinsinden anlık kur
}

// BuildOllamaUserPrompt global cron için Ollama kullanıcı mesajı üretir (portföy yok).
func BuildOllamaUserPrompt(records []datasource.MacroRecord, newsHeadlines []string) string {
	lines, m2Change, rezervChange, latest, _, ok := macroPromptFromRecords(records)
	if !ok {
		d := deterministicDistractor("Bilinmiyor", 1.0)
		return ollamaUserPromptBody("(makro kaydı yok)\n", newsHeadlines, d, false, nil)
	}

	var b strings.Builder
	b.WriteString("GÜNCEL MAKRO BAĞLAMI (son 3 ay, EVDS/TCMB):\n")
	b.WriteString(fmt.Sprintf("- M2 aylık değişim: %s\n", m2Change))
	b.WriteString(fmt.Sprintf("- 3 aylık rezerv değişimi: %s\n", rezervChange))
	for _, row := range lines {
		b.WriteString(fmt.Sprintf(
			"- %s | Dolar: %s TL | Rezerv: %sB USD (%s) | Cari: %sM USD | M2: %sT TL | REK: %s | Faiz: %s\n",
			row.Tarih, row.Dolar, row.Rez, row.Trend, row.Cari, row.M2, row.REK, row.Faiz,
		))
	}

	proxy := 1.0
	if latest.CariDenge != 0 {
		proxy = math.Abs(latest.CariDenge) / 1000
	}

	return ollamaUserPromptBody(b.String(), newsHeadlines, deterministicDistractor(latest.Tarih, proxy), latest.AltinSapma, nil)
}

// BuildOllamaPortfolioPrompt portföy analizi için Ollama kullanıcı mesajı üretir.
// newsHeadlines: son 5 haber başlığı+özeti (NewsAPI + EVDS duyuruları).
// portfolio: kullanıcının mevcut döviz pozisyonları.
func BuildOllamaPortfolioPrompt(records []datasource.MacroRecord, newsHeadlines []string, portfolio []PromptPortfolioItem) string {
	lines, m2Change, rezervChange, latest, _, ok := macroPromptFromRecords(records)
	if !ok {
		d := deterministicDistractor("Bilinmiyor", 1.0)
		return ollamaUserPromptBody("(makro kaydı yok)\n", newsHeadlines, d, false, portfolio)
	}

	var b strings.Builder
	b.WriteString("GÜNCEL MAKRO BAĞLAMI (son 3 ay, EVDS/TCMB):\n")
	b.WriteString(fmt.Sprintf("- M2 aylık değişim: %s\n", m2Change))
	b.WriteString(fmt.Sprintf("- 3 aylık rezerv değişimi: %s\n", rezervChange))
	for _, row := range lines {
		b.WriteString(fmt.Sprintf(
			"- %s | Dolar: %s TL | Rezerv: %sB USD (%s) | Cari: %sM USD | M2: %sT TL | REK: %s | Faiz: %s\n",
			row.Tarih, row.Dolar, row.Rez, row.Trend, row.Cari, row.M2, row.REK, row.Faiz,
		))
	}

	proxy := 1.0
	if latest.CariDenge != 0 {
		proxy = math.Abs(latest.CariDenge) / 1000
	}

	return ollamaUserPromptBody(b.String(), newsHeadlines, deterministicDistractor(latest.Tarih, proxy), latest.AltinSapma, portfolio)
}

func ollamaUserPromptBody(macroBlock string, newsHeadlines []string, distractor string, altinSapma bool, portfolio []PromptPortfolioItem) string {
	var b strings.Builder
	b.WriteString("Aşağıdaki güncel makroekonomik bağlamı, piyasa haberlerini ve gürültü verisini dikkate alarak soruyu cevapla. ")
	b.WriteString("Önce durum analizini (Düşünce Zinciri) yap, ardından sonucu belirtilen JSON formatında ver.\n\n")

	b.WriteString(macroBlock)

	// Haber bağlamı
	if len(newsHeadlines) > 0 {
		b.WriteString("\nSON PİYASA HABERLERİ (NewsAPI + EVDS, son güncel haberler):\n")
		for i, h := range newsHeadlines {
			if i >= 5 {
				break
			}
			b.WriteString(fmt.Sprintf("- %s\n", h))
		}
	}

	b.WriteString("\nGÜRÜLTÜ VERİSİ (çeldirici; bağlamdan ayırt et, analizde düşük güven ile ele al):\n")
	b.WriteString(distractor)
	b.WriteString("\n")

	if altinSapma {
		b.WriteString("Not: Bu dönemde cari denge verisinde altın sapması işareti (altin_sapma) bulunuyor; cari okumasını dikkatli yap.\n")
	}

	b.WriteString("\nRAFT KURALLARI (özet):\n")
	b.WriteString("- Net rezerv artıyorsa → kurda aşağı baskı, GUVENLI yönü\n")
	b.WriteString("- Cari açık büyüyor + sermaye girişi yoksa → kurda yukarı baskı, RISKLI\n")
	b.WriteString("- M2 büyümesi hızlıysa → TL değer kaybı riski\n")
	b.WriteString("- REK 100 üzerindeyse → TL aşırı değerli, orta vadede yukarı baskı\n")
	b.WriteString("- REK 75 altındaysa → TL aşırı ucuz, düzeltme potansiyeli\n")
	b.WriteString("- Reel faiz pozitifse (faiz > enflasyon beklentisi) → TL lehine\n")
	b.WriteString("- Piyasa haberleri RISKLI yönde yoğunlaşıyorsa risk bölgesini güncelle\n\n")

	hasPortfolio := len(portfolio) > 0
	if hasPortfolio {
		b.WriteString("KULLANICI PORTFÖYİ:\n")
		for _, p := range portfolio {
			karPct := 0.0
			if p.AlisKuru > 0 {
				karPct = (p.AnlikKur - p.AlisKuru) / p.AlisKuru * 100.0
			}
			b.WriteString(fmt.Sprintf(
				"- %s: %.2f adet | Alış: %.2f TL | Anlık: %.2f TL | K/Z: %+.1f%%\n",
				p.DovizKodu, p.Miktar, p.AlisKuru, p.AnlikKur, karPct,
			))
		}
		b.WriteString("\nAL/TUT/SAT KARAR KURALLARI:\n")
		b.WriteString("- SAT: Risk RISKLI VE kâr > %8 → kârı kilitle\n")
		b.WriteString("- AL: Risk GUVENLI VE zarar var → ortalama maliyeti düşür\n")
		b.WriteString("- TUT: Risk NOTR VEYA pozisyon sağlıklı → bekle\n\n")
		b.WriteString("Soru: Makro veriler, piyasa haberleri ve portföy durumuna göre USD/TRY risk bölgesi nedir ve her döviz için öneriniz nedir?\n\n")
	} else {
		b.WriteString("Soru: Güncel makroekonomik veriler ve piyasa haberlerine göre USD/TRY kurunun yönü ve risk bölgesi nedir?\n\n")
	}

	b.WriteString("YANIT (sadece JSON, başka metin yok):\n")
	if hasPortfolio {
		// Portföydeki her döviz için ayrı oneri objesi üret
		var exampleItems strings.Builder
		for i, p := range portfolio {
			if i > 0 {
				exampleItems.WriteString(",")
			}
			exampleItems.WriteString(fmt.Sprintf(`{"doviz_kodu":%q,"oneri":"TUT","gerekce":"Gerekce."}`, p.DovizKodu))
		}
		b.WriteString(fmt.Sprintf(
			`{"risk_bolgesi":"RISKLI","projeksiyon_3_ay":40.5,"projeksiyon_6_ay":43.2,"ozet":"Ozet.","doviz_onerileri":[%s]}`,
			exampleItems.String(),
		))
		b.WriteString("\noneri alani icin sadece AL, TUT veya SAT yaz.")
	} else {
		b.WriteString(`{"risk_bolgesi":"NOTR","projeksiyon_3_ay":39.0,"projeksiyon_6_ay":41.0,"ozet":"Piyasa ozeti.","doviz_onerileri":[]}`)
	}
	b.WriteString("\n")
	return strings.TrimSpace(b.String())
}

// deterministicDistractor tarih + sabit tohum ile deterministik çeldirici üretir.
func deterministicDistractor(tarih string, netHataProxyMilyar float64) string {
	h := fnv.New32a()
	_, _ = h.Write([]byte(tarih))
	_, _ = h.Write([]byte("|cold-analyst-distractor|"))
	sum := h.Sum32()

	x := int(sum%11) + 2
	dir := "geriledi"
	if sum&1 == 0 {
		dir = "yükseldi"
	}

	nh := netHataProxyMilyar
	if nh < 0.2 {
		nh = 0.2
	}
	if nh > 20 {
		nh = 20
	}

	altin := int(sum%76) + 20
	hacim := int(sum%331) + 90
	cikis := int(sum%851) + 50

	switch sum % 5 {
	case 0:
		return fmt.Sprintf("BIST 100 bu ay %%%d %s.", x, dir)
	case 1:
		return fmt.Sprintf("Net Hata ve Noksan kalemi %.2f milyar dolar olarak açıklandı.", nh)
	case 2:
		return fmt.Sprintf("Altın ithalatı bu ay %d ton ile rekor kırdı.", altin)
	case 3:
		return fmt.Sprintf("Borsa İstanbul günlük işlem hacmi %d milyar TL oldu.", hacim)
	default:
		return fmt.Sprintf("Yabancı yatırımcı BIST'ten %d milyon dolar çıkardı.", cikis)
	}
}
