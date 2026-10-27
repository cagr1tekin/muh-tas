package raft

import (
	"fmt"
	"hash/fnv"
	"math"
	"strings"

	"finans-test/internal/datasource"
)

// BuildOllamaUserPrompt, Modelfile SYSTEM'a dokunmadan Ollama /api/chat için tek user mesajı üretir:
// talimat + makro bağlam + deterministik çeldirici + soru + JSON şeması.
func BuildOllamaUserPrompt(records []datasource.MacroRecord) string {
	lines, m2Change, rezervChange, latest, _, ok := macroPromptFromRecords(records)
	if !ok {
		d := deterministicDistractor("Bilinmiyor", 1.0)
		return ollamaUserPromptBody("(makro kaydı yok)\n", d, false)
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

	proxy := 0.0
	if latest.CariDenge != 0 {
		proxy = math.Abs(latest.CariDenge) / 1000
	} else {
		proxy = 1.0
	}
	distr := deterministicDistractor(latest.Tarih, proxy)

	return ollamaUserPromptBody(b.String(), distr, latest.AltinSapma)
}

func ollamaUserPromptBody(macroBlock, distractor string, altinSapma bool) string {
	var b strings.Builder
	b.WriteString("Aşağıdaki güncel makroekonomik bağlamı ve gürültü verisini dikkate alarak soruyu cevapla. ")
	b.WriteString("Önce durum analizini (Düşünce Zinciri) yap, ardından sonucu belirtilen JSON formatında ver.\n\n")

	b.WriteString(macroBlock)
	b.WriteString("\n")

	b.WriteString("GÜRÜLTÜ VERİSİ (çeldirici; bağlamdan ayırt et, analizde düşük güven ile ele al):\n")
	b.WriteString(distractor)
	b.WriteString("\n")
	if altinSapma {
		b.WriteString("Not: Bu dönemde cari denge verisinde altın sapması işareti (altin_sapma) bulunuyor; cari okumasını dikkatli yap.\n")
	}
	b.WriteString("\n")

	b.WriteString("RAFT KURALLARI (özet):\n")
	b.WriteString("- Net rezerv artıyorsa → kurda aşağı baskı, GUVENLI yönü\n")
	b.WriteString("- Cari açık büyüyor + sermaye girişi yoksa → kurda yukarı baskı, RISKLI\n")
	b.WriteString("- M2 büyümesi hızlıysa → TL değer kaybı riski\n")
	b.WriteString("- REK 100 üzerindeyse → TL aşırı değerli, orta vadede yukarı baskı\n")
	b.WriteString("- REK 75 altındaysa → TL aşırı ucuz, düzeltme potansiyeli\n")
	b.WriteString("- Reel faiz pozitifse (faiz > enflasyon beklentisi) → TL lehine\n\n")

	b.WriteString("Soru: Güncel makroekonomik verilere göre USD/TRY kurunun yönü ve risk bölgesi nedir?\n\n")

	b.WriteString("ÇIKTI:\n")
	b.WriteString("1) Önce Düşünce Zinciri'ni düz metin olarak yaz.\n")
	b.WriteString("2) Ardından tek bir JSON nesnesi ver (markdown fence kullanma). Şema:\n")
	b.WriteString(`{"risk_bolgesi":"GUVENLI|RISKLI|NOTR","projeksiyon_3_ay":<0-500 sayı>,"projeksiyon_6_ay":<0-500 sayı>,"ozet":"<en fazla 2 cümle>","haber_basligi":"<en fazla 80 karakter>","haber_icerigi":"<250-400 kelime haber metni>"}`)
	b.WriteString("\n")
	return strings.TrimSpace(b.String())
}

// deterministicDistractor, raft_dataset_generator.build_distractor ile aynı tipte metinler; tarih + sabit tohum ile deterministik.
func deterministicDistractor(tarih string, netHataProxyMilyar float64) string {
	h := fnv.New32a()
	_, _ = h.Write([]byte(tarih))
	_, _ = h.Write([]byte("|cold-analyst-distractor|"))
	sum := h.Sum32()

	x := int(sum%11) + 2 // 2..12
	dirUp := sum&1 == 0
	dir := "geriledi"
	if dirUp {
		dir = "yükseldi"
	}

	option := int(sum % 5)
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

	switch option {
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
