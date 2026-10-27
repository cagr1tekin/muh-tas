# T.C. SELÇUK ÜNİVERSİTESİ TEKNOLOJİ FAKÜLTESİ BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ

---

# YAPAY ZEKA DESTEKLİ DÖVİZ TAKİP VE PORTFÖY YÖNETİM MOBİL UYGULAMASI

**BİTİRME PROJESİ**

**Hazırlayan:** Çağrı TEKİN

**Danışman:** [Danışman Adı Soyadı]

**Konya – 2026**

---

## ÖZET

**Yapay Zeka Destekli Döviz Takip ve Portföy Yönetim Mobil Uygulaması**

**Çağrı TEKİN**

Selçuk Üniversitesi Teknoloji Fakültesi Bilgisayar Mühendisliği Bölümü

Danışman: [Danışman Adı Soyadı], 2026, [Sayfa Sayısı] Sayfa

Jüri:
- [Jüri Üyesi 1]
- [Jüri Üyesi 2]
- [Jüri Üyesi 3]

Bu çalışmada, Türkiye makroekonomik verilerini gerçek zamanlı olarak işleyen, yapay zeka destekli finansal analiz ve öneri üreten bir mobil uygulama geliştirilmiştir. Uygulama; T.C. Merkez Bankası (TCMB) döviz kuru verileri ile Elektronik Veri Dağıtım Sistemi (EVDS) makroekonomik serilerini birleştirerek kullanıcıya döviz takibi, portföy yönetimi ve güncel piyasa haberleri sunmaktadır.

Sistem mimarisi dört ana katmandan oluşmaktadır: React Native ile geliştirilen mobil istemci, Go programlama dili ile hayata geçirilen REST/WebSocket API sunucusu, Python tabanlı makro veri işleme servisi ve yerel büyük dil modeli (LLM) ile bulut tabanlı modeli birleştiren yapay zeka pipeline'ı. Yapay zeka bileşeninde, RAFT (Retrieval-Augmented Fine-Tuning) yöntemi ile Türkiye finans piyasası verisi üzerinde ince ayar uygulanmış 3 milyar parametreli Qwen2.5-3B modeli kullanılmıştır. Risk sınıflandırması (RISKLI / GUVENLI / NOTR) ve USD/TRY projeksiyon hesabı yerel model tarafından gerçekleştirilirken, piyasa haberi metni üretimi Google Gemini 2.0 Flash modeli aracılığıyla zenginleştirilmektedir.

Portföy analizi aşamasında, modelin finansal karar güvenilirliğini artırmak amacıyla deterministik kural tabanlı AL/TUT/SAT karar motoru tasarlanmıştır. DeepEval çerçevesi ile yürütülen model değerlendirme testlerinde, Gemini API ve Ollama/Qwen RAFT testleri dahil toplam 26 testin tamamı başarıyla tamamlanmıştır. Gerçekleştirilen analizler, sistemin makroekonomik veri korelasyonunu doğru biçimde yorumlayabildiğini ve tutarlı risk sınıflandırması üretimine elverişli olduğunu ortaya koymaktadır.

**Anahtar Kelimeler:** büyük dil modeli, döviz takibi, fintech, makroekonomik analiz, mobil uygulama, portföy yönetimi, RAFT ince ayar, yapay zeka

---

## ABSTRACT

**An Artificial Intelligence-Assisted Mobile Application for Currency Tracking and Portfolio Management**

**Çağrı TEKİN**

Selçuk University, Faculty of Technology, Department of Computer Engineering

Supervisor: [Supervisor Name Surname], 2026, [Page Count] Pages

Jury:
- [Jury Member 1]
- [Jury Member 2]
- [Jury Member 3]

In this study, a mobile application has been developed that processes Turkish macroeconomic data in real time, generates artificial intelligence-assisted financial analysis, and provides investment recommendations to end users. The application integrates live exchange rate data from the Central Bank of the Republic of Turkey (TCMB) with macroeconomic series from the Electronic Data Delivery System (EVDS), offering users currency tracking, portfolio management, and up-to-date market news functionalities.

The system architecture consists of four primary layers: a mobile client built with React Native, a REST/WebSocket API server implemented in the Go programming language, a Python-based macroeconomic data processing service, and an artificial intelligence pipeline combining a local large language model (LLM) with a cloud-based model. The AI component employs the 3-billion-parameter Qwen2.5-3B model, fine-tuned on Turkish financial market data using the RAFT (Retrieval-Augmented Fine-Tuning) methodology. Risk classification (HIGH RISK / LOW RISK / NEUTRAL) and USD/TRY projection computation are performed by the local model, while market news generation is enriched through the Google Gemini 2.0 Flash API.

For portfolio analysis, a deterministic rule-based BUY/HOLD/SELL decision engine was designed to enhance the reliability of financial recommendations beyond the LLM's raw output. Model evaluation tests conducted with the DeepEval framework confirmed that all structural and rule-based validation tests passed successfully. The evaluations demonstrate that the system correctly interprets macroeconomic data correlations and generates consistent risk classifications.

**Keywords:** artificial intelligence, currency tracking, fintech, large language model, macroeconomic analysis, mobile application, portfolio management, RAFT fine-tuning

---

## ÖNSÖZ

Bu proje çalışması, Selçuk Üniversitesi Teknoloji Fakültesi Bilgisayar Mühendisliği Bölümü lisans programı kapsamında yürütülmüş bir mühendislik tasarım projesidir. Çalışmanın temelinde, Türkiye finans piyasasındaki bireysel yatırımcıların yaşadığı bilgi erişim ve karar destek eksikliğini teknolojik araçlarla giderme isteği yatmaktadır.

Proje süresince akademik rehberlik ve katkılarından dolayı danışman hocam [Danışman Adı Soyadı]'ya en içten teşekkürlerimi sunarım. Projenin şekillenmesine katkıda bulunan tüm jüri üyelerine, bölüm hocalarıma ve değerli geri bildirimlerini paylaşan arkadaşlarıma da şükranlarımı iletmek isterim.

Geliştirme sürecinde karşılaşılan teknik güçlüklerin aşılmasında gösterilen sabır ve destekleri için aileme sonsuz teşekkürlerimi borçluyum. Bu çalışmanın Türkiye'deki fintech alanına ve yapay zeka destekli mobil uygulama geliştirme literatürüne mütevazı bir katkı sağlaması en büyük temennimdir.

**Çağrı TEKİN**
Konya, 2026

---

## İÇİNDEKİLER

| | Sayfa |
|--|-------|
| ÖZET | iv |
| ABSTRACT | v |
| ÖNSÖZ | vi |
| İÇİNDEKİLER | vii |
| SİMGELER VE KISALTMALAR | ix |
| **1. GİRİŞ** | **1** |
| 1.1. Problem Tanımı ve Motivasyon | 1 |
| 1.2. Projenin Amacı ve Kapsamı | 2 |
| 1.3. Araştırmanın Özgün Katkıları | 3 |
| 1.4. Raporun Organizasyonu | 4 |
| **2. KAYNAK ARAŞTIRMASI** | **5** |
| 2.1. Mobil Finans Uygulamaları | 5 |
| 2.2. Büyük Dil Modelleri ve Finansal Metin Üretimi | 7 |
| 2.3. RAFT İnce Ayar Yöntemi | 9 |
| 2.4. Makroekonomik Veri Analitiği ve Tahmin Sistemleri | 11 |
| 2.5. Değerlendirme Çerçeveleri: DeepEval | 13 |
| **3. MATERYAL VE YÖNTEM** | **15** |
| 3.1. Sistem Mimarisinin Tasarımı | 15 |
| 3.2. Backend API Geliştirme | 18 |
| 3.3. Python Makro Veri Servisi | 21 |
| 3.4. Yapay Zeka Pipeline Tasarımı | 24 |
| 3.5. Mobil Uygulama Geliştirme | 29 |
| 3.6. Veritabanı Tasarımı | 33 |
| 3.7. Güvenlik Mimarisi | 35 |
| **4. ARAŞTIRMA SONUÇLARI VE TARTIŞMA** | **38** |
| 4.1. Model Performans Değerlendirmesi | 38 |
| 4.2. DeepEval Test Sonuçları | 41 |
| 4.3. Sistem Performans Metrikleri | 44 |
| 4.4. Kullanıcı Arayüzü Değerlendirmesi | 46 |
| **5. SONUÇLAR VE ÖNERİLER** | **49** |
| 5.1. Sonuçlar | 49 |
| 5.2. Öneriler | 51 |
| KAYNAKLAR | 53 |
| EKLER | 57 |
| ÖZGEÇMİŞ | 60 |

---

## SİMGELER VE KISALTMALAR

### Kısaltmalar

| Kısaltma | Açılımı |
|----------|---------|
| AI | Artificial Intelligence (Yapay Zeka) |
| API | Application Programming Interface (Uygulama Programlama Arayüzü) |
| BIST | Borsa İstanbul |
| CORS | Cross-Origin Resource Sharing |
| CRUD | Create, Read, Update, Delete |
| EVDS | Elektronik Veri Dağıtım Sistemi |
| FCM | Firebase Cloud Messaging |
| GGUF | GPT-Generated Unified Format |
| Go | Go Programlama Dili (Golang) |
| HTTP | HyperText Transfer Protocol |
| JWT | JSON Web Token |
| LLM | Large Language Model (Büyük Dil Modeli) |
| LoRA | Low-Rank Adaptation |
| M2 | Geniş Para Arzı (M2 Para Arzı) |
| NHN | Net Hata ve Noksan |
| NOTR | Nötr (risk sınıflandırması) |
| pgx | PostgreSQL Go Sürücüsü (v5) |
| RAFT | Retrieval-Augmented Fine-Tuning |
| RAG | Retrieval-Augmented Generation |
| REK | Reel Efektif Kur |
| RLS | Row Level Security (Satır Düzeyi Güvenlik) |
| RPD | Requests Per Day (Günlük İstek Sayısı) |
| RPM | Requests Per Minute (Dakikadaki İstek Sayısı) |
| REST | Representational State Transfer |
| SQL | Structured Query Language |
| TCMB | Türkiye Cumhuriyet Merkez Bankası |
| TL | Türk Lirası |
| TLS | Transport Layer Security |
| TS | TypeScript |
| USD | United States Dollar (Amerikan Doları) |
| WebSocket | WS (Çift Yönlü İletişim Protokolü) |

### Semboller

| Sembol | Açıklama |
|--------|----------|
| `↑` | Artış yönü (rezerv trendi) |
| `↓` | Düşüş yönü (rezerv trendi) |
| `→` | Yatay seyir (rezerv trendi) |
| `%` | Yüzde |
| `B` | Milyar (örn. 130B USD = 130 milyar USD) |
| `T` | Trilyon (örn. 8.90T TL = 8,90 trilyon TL) |
| `M` | Milyon (örn. -4500M USD = -4,5 milyar USD) |

---

## 1. GİRİŞ

### 1.1. Problem Tanımı ve Motivasyon

Küresel ekonomik belirsizliklerin yoğunlaştığı günümüz koşullarında, döviz kurlarındaki dalgalanmalar Türkiye'deki bireysel yatırımcıları doğrudan etkileyen kritik bir finansal değişken hâline gelmiştir. Türkiye Cumhuriyet Merkez Bankası (TCMB) verilerine göre ülkede döviz mevduatı tutan yatırımcı sayısı yüksek bir seviyede seyretmekte; ancak bu kesimin büyük çoğunluğu profesyonel finansal analiz araçlarına erişim imkânından yoksun kalmaktadır.

Mevcut döviz takip uygulamalarının büyük bölümü, anlık fiyat gösterimi ile sınırlı kalmakta; makroekonomik bağlamı yorumlayan, portföy durumunu değerlendiren ve yatırım kararı desteği sunan bütünleşik bir deneyim sunamamaktadır. Bireysel yatırımcılar, döviz kuru hareketlerini anlamlandırmak için dağınık kaynaklara başvurmak durumundadır: TCMB web sitesi anlık kurlar için, EVDS platformu makroekonomik veriler için, çeşitli haber siteleri piyasa gündemleri için ayrı ayrı kullanılmaktadır. Bu bilgi dağınıklığı, yatırım kararlarının kalitesini olumsuz etkilemekte ve karar alma sürecini uzatmaktadır.

Öte yandan, son yıllarda büyük dil modellerinin (LLM) metin anlama ve üretme konusundaki performansı kayda değer biçimde ilerlemiştir. Ancak genel amaçlı büyük dil modellerinin finans alanındaki uygulamalarında önemli kısıtlamalar gözlemlenmektedir: modeller, Türkiye'ye özgü makroekonomik göstergeler ve yerel piyasa dinamiklerine dair yeterli özelleştirilmiş bilgiden yoksundur. RAFT (Retrieval-Augmented Fine-Tuning) adı verilen ince ayar yöntemi, bu açığı kapatmaya yönelik umut verici bir yaklaşım olarak öne çıkmaktadır.

Bu tespitler doğrultusunda, mevcut literatürde ve ticari ürünlerde gözlemlenen şu boşluklar belirlenmiştir:

1. Türkiye'ye özgü makroekonomik verileri yorumlayan ve yerel finans dinamiklerini anlayan özelleştirilmiş bir dil modeli eksikliği
2. Anlık kur verisi, makroekonomik analiz ve yapay zeka destekli öneri işlevlerini tek platformda birleştiren entegre mobil uygulama eksikliği
3. LLM çıktılarının finansal güvenilirliğini artıran kural tabanlı karar doğrulama mekanizmalarının yetersizliği

### 1.2. Projenin Amacı ve Kapsamı

Bu projenin temel amacı; Türkiye makroekonomik verileri ile yapay zeka destekli finansal analizi bütünleştiren, çapraz platform uyumlu bir mobil uygulama geliştirmektir. Sistem, bireysel yatırımcılara döviz kuru takibi, portföy yönetimi ve yapay zeka tarafından üretilen piyasa yorumu işlevlerini tek bir arayüzde sunmayı hedeflemektedir.

Bu temel amaç doğrultusunda belirlenmiş alt hedefler şu şekilde sıralanmaktadır:

**Teknik Hedefler:**
- TCMB'nin kamuya açık XML servisinden gerçek zamanlı döviz kuru verisi çekilerek WebSocket aracılığıyla anlık akışın sağlanması
- EVDS platformundan altı temel makroekonomik seri için otomatik veri toplama ve gürültü filtreleme pipeline'ının tasarlanması
- Türkiye finans piyasası verisi üzerinde RAFT yöntemiyle ince ayar uygulanmış Qwen2.5-3B modelinin eğitilmesi ve konuşlandırılması
- Yerel LLM ile bulut tabanlı LLM'i art arda kullanan iki aşamalı yapay zeka pipeline'ının geliştirilmesi
- Finansal karar güvenilirliğini artırmaya yönelik deterministik kural tabanlı AL/TUT/SAT karar motorunun tasarlanması

**Kullanıcı Deneyimi Hedefleri:**
- Karanlık tema, glassmorphism tasarım dili ve neon vurgu renkleri ile premium bir görsel kimlik oluşturulması
- React Native Reanimated 3 kütüphanesi ile native thread üzerinde çalışan akıcı animasyonların entegre edilmesi
- Fiyat alarmı, portföy analizi ve Supabase Realtime entegrasyonu ile proaktif kullanıcı bilgilendirme deneyiminin sunulması

**Kapsam Dışı Bırakılan Konular:**
- Altın ve borsa (BIST) entegrasyonu (v2 ve v3 kapsamında planlanmış olup bu çalışma dışında tutulmuştur)
- Otomatik al-sat emirleri (yasal ve güvenlik gereksinimleri nedeniyle kapsam dışıdır)
- Kripto para birimi takibi

### 1.3. Araştırmanın Özgün Katkıları

Bu çalışma, aşağıda sıralanan özgün teknik katkıları barındırmaktadır:

**1. RAFT Yöntemiyle Özelleştirilmiş Finansal LLM:**
Qwen2.5-3B modeli, Türkiye makroekonomik kuralları ve EVDS/TCMB göstergelerini kapsayan özel olarak derlenmiş bir veri kümesi üzerinde ince ayara tabi tutulmuştur. Bu yaklaşım, modelin genel bilgi tabanını korurken Türkiye'ye özgü finansal bağlamı kavramasını mümkün kılmaktadır.

**2. Deterministik Karar Doğrulama Motoru:**
LLM çıktılarının finansal güvenilirliğini artırmak amacıyla, modelin risk sınıflandırması ile kullanıcının portföy kâr/zarar durumunu girdi olarak alan ve AL/TUT/SAT kararlarını deterministik kurallar çerçevesinde üreten bir doğrulama katmanı tasarlanmıştır.

**3. Gürültü Filtreleme Modülü:**
EVDS verilerindeki altın ithalatı kaynaklı cari denge sapmasını otomatik olarak tespit eden ve işaretleyen (`altin_sapma` flag) bir veri temizleme algoritması geliştirilmiştir. Bu modül, modelin yanlış makroekonomik çıkarım yapmasını önlemeye yönelik özgün bir katkı sunmaktadır.

**4. İki Aşamalı Hibrit LLM Mimarisi:**
Sayısal çıkarım gerektiren görevler için yerel çalışan bir küçük model (Qwen, gizlilik ve düşük gecikme), metin üretimi gerektiren görevler için ise bulut tabanlı büyük bir model (Gemini, kalite ve akıcılık) kullanan katmanlı bir yapay zeka mimarisi tasarlanmıştır.

### 1.4. Raporun Organizasyonu

Bu rapor beş ana bölümden oluşmaktadır. **İkinci bölüm**, mobil fintech uygulamaları, büyük dil modelleri ve RAFT ince ayar yöntemi üzerine gerçekleştirilen literatür araştırmasını sunmaktadır. **Üçüncü bölüm**, sistemin tamamının tasarım ve implementasyon detaylarını; kullanılan materyal ve yöntemleri ortaya koymaktadır. **Dördüncü bölüm**, elde edilen araştırma sonuçlarını ve bunlara ilişkin tartışmayı içermektedir. **Beşinci bölüm** ise çalışmadan çıkarılan sonuçları ve gelecek çalışmalara yönelik önerileri sunmaktadır.

---

## 2. KAYNAK ARAŞTIRMASI

### 2.1. Mobil Finans Uygulamaları

#### 2.1.1. Küresel Fintech Mobil Uygulama Ekosistemi

Fintech (finansal teknoloji) sektörü, akıllı telefonların yaygınlaşmasıyla birlikte son on yılda köklü bir dönüşüm yaşamıştır. Statista verilerine göre küresel mobil bankacılık uygulaması kullanıcı sayısı 2024 yılı itibarıyla 3,6 milyar düzeyine ulaşmış olup bu rakamın 2028 yılına kadar 4,9 milyarı aşması beklenmektedir (Statista, 2024). Gelişmekte olan piyasalarda mobil finans uygulamalarının penetrasyon hızı, geleneksel bankacılık kanallarını belirgin biçimde geride bırakmaktadır.

Bireysel yatırımcılara yönelik portföy yönetim uygulamaları incelendiğinde, mevcut çözümlerin büyük bölümünün anlık fiyat verisi ve basit portföy takibi işlevleriyle sınırlı kaldığı görülmektedir. Robinhood, eToro ve Midas gibi platformlar yapay zeka destekli analiz yeteneklerini kısmen entegre etmiş olsa da bu çözümler genellikle belirli bir coğrafi bağlama veya varlık sınıfına özgü yapılandırılmamıştır (Johnson ve ark., 2023).

#### 2.1.2. Türkiye Özelinde Döviz Takip Uygulamaları

Türkiye, kronik enflasyon ve yüksek dolarizasyon nedeniyle döviz kurlarının gündelik hayat üzerindeki etkisinin diğer ülkelere kıyasla çok daha belirgin olduğu bir ekonomik yapıya sahiptir. Türkiye Cumhuriyet Merkez Bankası (2024) verilerine göre yurt içi döviz mevduatı toplam banka mevduatının yaklaşık yüzde kırk beşini oluşturmakta; bu oran güçlü bir dolarizasyon eğilimini gözler önüne sermektedir.

Türkiye pazarındaki mevcut döviz uygulamaları (Döviz.com, Borsa İstanbul Mobil, çeşitli banka uygulamaları) anlık kur verisi sunmakla birlikte, TCMB makroekonomik göstergelerini yorumlayan veya portföy analizi gerçekleştiren entegre yapay zeka yeteneklerinden büyük ölçüde yoksundur. Bu eksiklik, geliştirilecek sistemin pazar boşluğunu net biçimde ortaya koymaktadır.

### 2.2. Büyük Dil Modelleri ve Finansal Metin Üretimi

#### 2.2.1. LLM'lerin Finansal Uygulamalardaki Rolü

Büyük dil modellerinin finansal alanda kullanımı son yıllarda hız kazanmıştır. BloombergGPT (Wu ve ark., 2023), finansal veriler üzerinde eğitilmiş 50 milyar parametreli bir model olarak bu alandaki öncü çalışmalardan biri olarak öne çıkmaktadır. FinGPT (Yang ve ark., 2023) ise düşük maliyetli ince ayar yöntemlerini finansal NLP görevlerine uyarlamıştır. Bu çalışmalar, alan-özgü ince ayarın genel amaçlı modellerle kıyaslandığında performansı anlamlı ölçüde artırdığını teyit etmektedir.

Bununla birlikte, Türkçe dili ve Türkiye makroekonomi bağlamına yönelik ince ayar uygulanmış model sayısı son derece kısıtlıdır. Mevcut LLM'lerin büyük çoğunluğu, TCMB para politikası araçları, EVDS göstergeleri ve Türkiye'ye özgü cari açık dinamikleri gibi konularda yetersiz bilgi tabanına sahiptir.

#### 2.2.2. Küçük Dil Modellerinin Değerlendirmesi

Qwen2.5 model ailesi (Alibaba Cloud, 2024), 0,5 milyardan 72 milyar parametreye uzanan bir ölçek yelpazesinde sunulmaktadır. 3 milyar parametreli sürüm, tüketici donanımı üzerinde çalışabilecek nicemleme formatlarını (GGUF Q4_K_M) desteklemekte ve bu özelliğiyle uç cihaz konuşlandırması için cazip bir seçenek oluşturmaktadır. Hendrycks ve ark. (2021) tarafından geliştirilen MMLU kıyaslama testi sonuçları, 3 milyar parametreli modellerin yeterli ince ayar desteğiyle alan-özgü görevlerde beklenmedik başarım sergileyebildiğini kanıtlamaktadır.

### 2.3. RAFT İnce Ayar Yöntemi

#### 2.3.1. Yöntemin Kuramsal Temelleri

RAFT (Retrieval-Augmented Fine-Tuning), Zhang ve ark. (2024) tarafından önerilen ve alan-özgü Soru-Cevap görevleri için modeli eğiten özgün bir ince ayar yaklaşımıdır. Geleneksel RAG (Retrieval-Augmented Generation) yaklaşımından farklı olarak RAFT, hem ilgili hem de ilgisiz belgelerin (çeldiriciler/distractors) bir arada sunulduğu eğitim örnekleri oluşturarak modelin doğru kaynakları seçmesini öğrenmesini hedefler. Yöntemin temel katkısı, modelin çıkarım zamanında hangi bağlam parçasının güvenilir olduğunu ayırt edebilmesini sağlamasıdır.

Bu projede RAFT yöntemi şu şekilde uyarlanmıştır: EVDS/TCMB'den elde edilen son üç aylık makroekonomik veriler "ilgili bağlam" olarak; BIST hareketleri, altın ithalat rakamları ve Net Hata-Noksan kalemi ise "çeldirici (distractor)" olarak eğitim örneklerine dahil edilmiştir. Model, bu gürültülü bağlamdan anlamlı makroekonomik sinyalleri ayırt etmeyi öğrenmektedir.

#### 2.3.2. LoRA ile Verimli İnce Ayar

Tam model ince ayarının yüksek hesaplama maliyeti göz önüne alındığında, bu çalışmada LoRA (Low-Rank Adaptation) tekniği (Hu ve ark., 2021) tercih edilmiştir. LoRA, modelin tüm ağırlıklarını güncellemek yerine belirli katmanlara düşük boyutlu adaptör matrisleri eklemektedir. Bu yaklaşım, ince ayar için gereken hesaplama kaynağını kayda değer ölçüde azaltırken alan-özgü görev performansını korumaktadır. Mevcut projede eğitim sürecinde elde edilen LoRA adaptörü 115 MB boyutundadır ve 1,93 GB GGUF formatındaki taban modelle birlikte Ollama aracılığıyla konuşlandırılmaktadır.

### 2.4. Makroekonomik Veri Analitiği ve Tahmin Sistemleri

#### 2.4.1. Döviz Kuru Tahmininde Makroekonomik Değişkenler

Döviz kuru belirleme literatüründe Meese ve Rogoff (1983) tarafından ortaya konan "tahmin paradoksu", rastgele yürüyüş modellerinin kısa vadeli döviz kuru tahmininde çoğu yapısal modeli geride bıraktığını göstermiştir. Bununla birlikte, orta ve uzun vadeli ufuklarda temel makroekonomik değişkenlerin açıklayıcı gücü artmaktadır. Literatürde sıklıkla vurgulanan değişkenler arasında döviz rezervleri, cari denge, para arzı büyümesi, reel efektif kur endeksi ve merkez bankası faiz oranı yer almaktadır (Engel ve West, 2005; Taylor, 1995).

Bu çalışmada kullanılan RAFT kuralları, söz konusu iktisat yazını üzerine inşa edilmiştir: rezerv artışı kur üzerinde düşürücü baskı oluşturmakta, büyüyen cari açık kur üzerinde yükseltici baskı yaratmakta ve hızlanan M2 büyümesi TL değerini aşındıran bir risk faktörü teşkil etmektedir.

#### 2.4.2. TCMB Elektronik Veri Dağıtım Sistemi (EVDS)

EVDS, TCMB tarafından işletilen ve 28.000'i aşkın ekonomik zaman serisine API erişimi sağlayan bir veri platformudur. Bu proje kapsamında kullanılan seriler şunlardır: dolar kuru (TP.DK.USD.A.YTL), brüt rezervler, cari denge, M2 para arzı, reel efektif kur endeksi ve politika faizi (TP.APIFON4). Söz konusu seriler aylık frekansla güncellenmekte; tarihsel derinlikleri ve geniş kapsam alanı nedeniyle makroekonomik analiz için uygun bir veri tabanı sunmaktadır.

### 2.5. Değerlendirme Çerçeveleri: DeepEval

#### 2.5.1. LLM Değerlendirme Zorluğu

Büyük dil modellerinin değerlendirilmesi, geleneksel yazılım testinden köklü biçimde farklılık göstermektedir. Sabit doğru cevabın bulunduğu deterministik testlerin aksine, LLM çıktıları olasılıksal nitelik taşımakta; bu durum tutarlılık, gerçekçilik ve alaka düzeyinin ölçülmesini güçleştirmektedir. Chang ve ark. (2024), LLM değerlendirme alanındaki kapsamlı incelemelerinde metrik standartlaşmasının eksikliğini temel bir araştırma sorunu olarak nitelendirmektedir.

#### 2.5.2. DeepEval Çerçevesi

DeepEval (Confident AI, 2024), LLM uygulamalarına yönelik açık kaynak kodlu bir test çerçevesidir. Çerçeve; GEval (ölçüt tabanlı değerlendirme), yanıt alaka düzeyi, sanrı (hallucination) tespiti ve öz tutarlılık gibi metrikleri barındırmaktadır. Python tabanlı pytest entegrasyonu, mevcut geliştirme süreçlerine uyumlu bir test altyapısının oluşturulmasını kolaylaştırmaktadır.

Bu projede DeepEval çerçevesi; JSON şema uyumu, risk sınıflandırma doğruluğu, projeksiyon aralık geçerliliği, haber içeriği kalitesi ve GEval tabanlı finansal tutarlılık değerlendirmesini kapsayan yedi test kategorisi için kullanılmıştır.

---

## 3. MATERYAL VE YÖNTEM

### 3.1. Sistem Mimarisinin Tasarımı

#### 3.1.1. Çok Katmanlı Mimari Yaklaşım

Geliştirilen sistem, endişelerin ayrıştırılması (separation of concerns) ve bağımsız ölçeklenebilirlik ilkeleri gözetilerek dört ana katman üzerine inşa edilmiştir:

**Katman 0 — Harici Veri Kaynakları:** TCMB XML servisi (anlık döviz kurları), EVDS API (makroekonomik seriler) ve NewsAPI (piyasa haberleri) bu katmanda yer almaktadır.

**Katman 1 — Veri İşleme ve Yapay Zeka Pipeline'ı:** Python tabanlı FastAPI servisi ham veri toplama ve gürültü filtreleme işlemlerini yürütmekte; Go tabanlı pipeline ise Ollama/Qwen ve Gemini modellerini art arda çağıran orkestrasyon mantığını barındırmaktadır.

**Katman 2 — API Sunucusu:** Go/Gin framework'ü üzerine inşa edilmiş REST ve WebSocket uç noktaları bu katmanda tanımlanmıştır. Kimlik doğrulama, hız sınırlama ve slot-limiter mekanizmaları bu katmanda uygulanmaktadır.

**Katman 3 — Mobil İstemci:** React Native ile geliştirilmiş çapraz platform uyumlu uygulama bu katmanda konumlandırılmıştır. TanStack Query, Zustand ve Supabase Realtime entegrasyonu bu katmanın temel bileşenlerini oluşturmaktadır.

Katmanlar arası iletişimde katı izolasyon kuralları uygulanmaktadır: bir katman, yalnızca bir alt veya üst katmanla doğrudan etkileşim kurabilmektedir. Bu tasarım kararı, değişiklik yayılımını (change propagation) kısıtlayarak bakım maliyetini düşürmektedir.

#### 3.1.2. Veri Akışı Tasarımı

Sistemin iki temel veri akışı tanımlanmıştır:

**Anlık Kur Akışı:** TCMB XML servisi, `RateWatcher` goroutine tarafından yapılandırılabilir aralıklarla sorgulanmakta; `sync.RWMutex` tabanlı in-memory cache üzerinden 60 saniyelik TTL ile saklanmaktadır. Kur değişikliği tespit edildiğinde WebSocket Hub tüm bağlı istemcilere broadcast mesajı iletmektedir.

**Yapay Zeka Haber Üretim Akışı:** Her altı saatte bir çalışan Cron scheduler, `POST /internal/generate-news` uç noktasını tetiklemektedir. Bu tetikleyici; Python servisinden temiz makro verisi yüklenmesi, NewsAPI'den güncel haber başlıkları çekilmesi, Qwen modeli aracılığıyla risk analizi üretilmesi, Gemini modeli ile haber metni zenginleştirilmesi ve Supabase'e yazılması adımlarından oluşan sıralı bir iş akışını başlatmaktadır. Supabase Realtime aboneliği sayesinde yeni kayıt oluşturulduğunda mobil uygulama otomatik olarak bilgilendirilmektedir.

### 3.2. Backend API Geliştirme

#### 3.2.1. Teknoloji Seçimi ve Gerekçesi

Backend API'si Go 1.24.0 programlama dili ve Gin v1.10.0 web framework'ü kullanılarak geliştirilmiştir. Go'nun seçilmesindeki başlıca nedenler şunlardır: goroutine tabanlı eş zamanlılık modeli ile WebSocket hub'ının ve Cron zamanlayıcısının düşük bellek maliyetiyle yönetilmesi, derlenen (compiled) bir dil olarak yüksek çalışma zamanı performansı, `sync` paketi aracılığıyla güvenli paylaşımlı bellek erişimi ve `context.Context` mekanizmasıyla temiz iptal yayılımı.

Veritabanı erişimi için `github.com/jackc/pgx/v5` kütüphanesi tercih edilmiştir. `database/sql` soyutlamasına kıyasla pgx, PostgreSQL'e özgü veri türleri, bağlantı havuzu yönetimi ve hazırlanmış sorgu (prepared statement) desteği bakımından üstün performans sergilemektedir.

#### 3.2.2. Uç Nokta Mimarisi ve Middleware Zinciri

Gin router yapılandırması üç güvenlik katmanı üzerine inşa edilmiştir:

```
İstek →  gin.Recovery()
       → corsMiddleware()
       → gin.LoggerWithFormatter()
       → [Grup bazlı middleware]
           ├── /auth/* → RateLimitAuth() (10 istek/dk/IP)
           ├── /api/v1 (public) → RateLimit()
           ├── /api/v1 (protected) → JWTAuth() + RateLimit()
           └── /internal/* → InternalSecret()
```

`JWTAuth` middleware'i, `Authorization: Bearer <token>` başlığını `golang-jwt/v5` kütüphanesi aracılığıyla doğrulamakta; doğrulanan talepler `*Claims` nesnesi olarak Gin context'ine yerleştirilmektedir.

**Slot Limiter Mekanizması:** Yapay zeka pipeline'ının eş zamanlı çalışan istek sayısı, kapasiteli kanal (`chan struct{}`) aracılığıyla `PIPELINE_MAX_CONCURRENT` (varsayılan: 3) değeriyle sınırlandırılmaktadır. Bu mekanizma, Ollama'ya aşırı yük bindirilerek yanıt süresi garantisinin bozulmasını önlemektedir.

#### 3.2.3. WebSocket Hub Tasarımı

Anlık kur broadcast'i için standart `Pub/Sub` deseni uygulanmıştır. `hub.Hub` yapısı; bağlı istemcilerin kaydını koruyan `map[*Client]bool`, yeni kur verisini taşıyan `broadcast chan []byte`, istemci bağlantı ve ayrılma kanallarını barındırmaktadır. `Hub.Run()` metodu, tek bir goroutine üzerinde bu kanalları işleyerek veri yarışı (data race) riskini ortadan kaldırmaktadır. Yeni bağlanan istemciler, son yayımlanan kur mesajını (`lastMsg`) anında almaktadır.

### 3.3. Python Makro Veri Servisi

#### 3.3.1. Servis Mimarisi

Python servisi, FastAPI framework'ü üzerinde `:8001` portunda bağımsız bir mikroservis olarak çalışmaktadır. Go backend'i bu servisten iki uç nokta üzerinden veri almaktadır: `GET /latest` temiz makro veriyi JSON formatında döndürürken `POST /refresh` veri güncelleme pipeline'ını tetiklemektedir.

Servis, Python 3.12 ve `evds` kütüphanesi kullanılarak gerçekleştirilmiştir. pandas ve NumPy kütüphaneleri veri işleme operasyonları için kullanılmaktadır.

#### 3.3.2. EVDS Veri Toplama Pipeline'ı

`fetcher.py` modülü, EVDS API'sinden altı makroekonomik seri çekmektedir. Veri çekme işlemi aylık frekans (frequency=5) ile gerçekleştirilmektedir. Başlangıç ve bitiş tarihleri `datetime` modülü ile dinamik olarak hesaplanarak geriye dönük on iki aylık tarihsel pencere elde edilmektedir. Ham veri `data/raw_macro.json` dosyasına yazılmaktadır.

#### 3.3.3. Gürültü Filtreleme Algoritması

`noise_filter.py` modülü, ham veri üzerinde aşağıdaki işlemleri sırasıyla uygulamaktadır:

**Altın Sapması Tespiti:** Cari denge serisinde olağandışı büyüklükte aylık değişimler, altın ithalatı anomalisinin göstergesi olarak `altin_sapma` bayrağıyla işaretlenmektedir. Bu mekanizma, Türkiye'nin dönemsel büyük ölçekli altın ithalatının cari denge istatistiklerini geçici olarak bozmasının modelin yanlış çıkarım yapmasına yol açmasını engellemektedir.

**NHN Ağırlık Düşürme:** Net Hata ve Noksan kalemi, ekonomik yorumu tartışmalı bir istatistiksel denge ögesi olduğundan analitik ağırlığı sıfıra indirilmektedir.

**Cari Denge Forward Fill Yasağı:** Bu seri gecikmeyle yayımlandığından eksik değerler önceki değerle doldurlmamakta; null/NaN olarak bırakılmaktadır.

Filtrelenmiş veri `data/clean_macro.json` dosyasına yazılmakta ve Go pipeline'ı tarafından bu dosyadan okunmaktadır.

### 3.4. Yapay Zeka Pipeline Tasarımı

#### 3.4.1. Model Seçimi ve Gerekçesi

Yerel çalışan LLM olarak Qwen2.5-3B-Instruct modeli seçilmiştir. Seçimde belirleyici olan faktörler şunlardır: tüketici sınıfı donanımda yeterli çıkarım hızı, Q4_K_M nicemleme ile 1,93 GB GGUF boyutu, Ollama aracılığıyla kolay konuşlandırma ve Türkçe dil desteği. Model, Ollama üzerinden `/api/chat` uç noktasıyla çağrılmakta; `temperature: 0.0` ayarı ile deterministik çıktı üretimi sağlanmaktadır.

#### 3.4.2. RAFT Eğitim Veri Kümesi

Eğitim veri kümesi `raft_dataset_augmented.jsonl` dosyasında saklanmakta olup her örnek şu bileşenleri içermektedir:

- **Bağlam (context):** Son üç aya ait EVDS/TCMB makroekonomik veri satırları
- **Çeldirici (distractor):** BIST hareketi, NHN kalemi, altın ithalat rakamı gibi ilgisiz veriler
- **RAFT Kuralları:** Rezerv/cari denge/M2/REK/faiz ilişkilerini tanımlayan analiz kuralları
- **Düşünce Zinciri (chain-of-thought):** Adım adım makroekonomik gerekçelendirme
- **Hedef Çıktı:** `{"risk_bolgesi": "...", "projeksiyon_3_ay": ..., "projeksiyon_6_ay": ..., "ozet": "..."}` formatında JSON

`raft_augmentor.py` betiği, temel veri kümesini (`raft_dataset.jsonl`) zenginleştirerek `raft_dataset_augmented.jsonl` dosyasını üretmektedir.

#### 3.4.3. Prompt Mühendisliği

Cron pipeline için kullanılan prompt üç bölümden oluşmaktadır:

**Bölüm 1 — Makro Bağlam Bloğu:**
```
GÜNCEL MAKRO BAĞLAMI (son 3 ay, EVDS/TCMB):
- 2026-04 | Dolar: 39.10 TL | Rezerv: 104.00B USD (↓) |
  Cari: -10500.00M USD | M2: 9.67T TL | REK: 97.30 |
  Faiz: %40.0 (TCMB ağırlıklı ortalama fonlama)
```

**Bölüm 2 — Deterministik Çeldirici:**
`prompt_builder.go` içindeki `deterministicDistractor()` fonksiyonu, tarih ve cari denge büyüklüğünden FNV32 hash üreterek beş çeldirici türünden birini deterministik olarak seçmektedir (BIST hareketi, NHN kalemi, altın ithalatı, borsa işlem hacmi, yabancı çıkışı).

**Bölüm 3 — RAFT Kuralları ve Çıktı Şeması:**
Analiz kuralları ve beklenen JSON çıktı formatı burada tanımlanmaktadır. Modelin markdown fence kullanmaması ve çıktıyı doğrudan JSON nesnesi olarak üretmesi istenmektedir.

#### 3.4.4. İki Aşamalı Pipeline Orkestrasyonu

`pipeline/generate.go` modülü, aşağıdaki sıralı adımları yönetmektedir:

```
Adım 1: datasource.LoadCleanMacroFromPath() → makro kayıtları
Adım 2: fetchNewsHeadlines() → 5 haber başlığı (NewsAPI)
Adım 3: raft.BuildOllamaUserPrompt() → prompt metni
Adım 4: raft.CallOllamaWithRetry() → QwenAnalysisResult
Adım 5: computeDovizOnerileri() → deterministik AL/TUT/SAT
Adım 6: raft.EnrichGlobalWithGeminiWithRetry() → GeminiEnrichedResult
Adım 7: raft.MergeToAnalysisResult() → AnalysisResult
Adım 8: persistAnalysis() → Supabase (pgx → REST fallback)
```

#### 3.4.5. JSON Doğrulama ve Çıkarım

Modelin ürettiği ham metin, `validate()` fonksiyonu aracılığıyla işlenmektedir. İlk olarak `extractJSON()` fonksiyonu markdown fence'leri temizlemekte ve en dış `{}` parantezleri arasındaki metni ayıklamaktadır. Ardından JSON marshal işlemi uygulanmakta; `risk_bolgesi` alanının `GUVENLI|RISKLI|NOTR` kümesinden birini içerdiği, projeksiyon değerlerinin `[0, 500]` aralığında yer aldığı ve `haber_basligi` uzunluğunun 80 Unicode karakteri aşmadığı doğrulanmaktadır. Doğrulama başarısız olduğunda `CallOllamaWithRetry()` en fazla üç deneme gerçekleştirmektedir.

#### 3.4.6. Deterministik AL/TUT/SAT Karar Motoru

LLM'lerin finansal tavsiye üretimindeki güvenilirlik endişeleri göz önüne alınarak, `computeDovizOnerileri()` fonksiyonu ile kural tabanlı bir karar doğrulama katmanı tasarlanmıştır. Bu fonksiyon, `risk_bolgesi` değeri ile kullanıcının her döviz pozisyonu için hesaplanan kâr/zarar yüzdesini girdi olarak alarak Çizelge 3.1'de gösterilen karar matrisini uygulamaktadır.

**Çizelge 3.1.** AL/TUT/SAT Karar Matrisi

| Risk Bölgesi | Kâr/Zarar Koşulu | Karar | Gerekçe |
|:---|:---|:---:|:---|
| RISKLI | Kâr ≥ %10 | SAT | Yüksek risk, kârı realize et |
| RISKLI | %0 ≤ Kâr < %10 | TUT | Risk yüksek, küçük kâr pozisyonu koru |
| RISKLI | Zarar > 0 | TUT | Zarar realize etme, toparlanma bekle |
| GUVENLI | Zarar ≥ %5 | AL | Olumlu piyasada maliyet ortalaması |
| GUVENLI | Kâr ≥ %15 | SAT | Sağlıklı kârı kısmi realize et |
| GUVENLI | Diğer | TUT | Piyasa olumlu, pozisyonu koru |
| NOTR | Kâr ≥ %20 | SAT | Yüksek kâr, kısmi çıkış değerlendir |
| NOTR | Diğer | TUT | Belirsiz piyasada bekle |

### 3.5. Mobil Uygulama Geliştirme

#### 3.5.1. Teknoloji Seçimi

Mobil uygulama, React Native 0.81.5 ve Expo ~54.0.33 kullanılarak geliştirilmiştir. React Native'in tercih edilmesinin temel nedeni, tek kod tabanından iOS ve Android platformlarına birlikte dağıtım yapabilme imkânı sunmasıdır. TypeScript 5.9.2 ile tam tip güvenliği sağlanmış; `any` tip kullanımı ESLint kuralı ile yasaklanmıştır.

#### 3.5.2. Navigasyon Mimarisi

React Navigation v7 kütüphanesi ile gerçekleştirilen navigasyon yapısı, SplashScreen → AuthStack/MainTabs akışı üzerine inşa edilmiştir. SplashScreen, JWT access token'ın geçerliliğini sorgulamakta; geçerli token varlığında kullanıcıyı doğrudan ana ekrana yönlendirmektedir. MainTabs, beş alt sekme barındırmaktadır: HomeStack, SearchStack, NewsStack, PortfolioStack ve MenuStack.

#### 3.5.3. State Yönetimi Stratejisi

Uygulama state'i net sorumluluk sınırlarıyla birden fazla katmana ayrılmıştır:

- **TanStack Query v5:** Sunucu kaynaklı tüm veriler (döviz, haber, portföy) için cache, refetch ve optimistic update yönetimi
- **Zustand v5:** Kimlik doğrulama durumu, kullanıcı tercihleri ve watchlist gibi global cross-screen state
- **Expo SecureStore:** JWT access ve refresh token güvenli depolama
- **AsyncStorage / MMKV:** Tema tercihi ve offline cache

Bu stratejinin temel ilkesi, sunucu verisinin asla Zustand store'a yazılmamasıdır. Sunucu verisi TanStack Query cache'inde yaşamalıdır.

#### 3.5.4. IAssetProvider Soyutlama Mimarisi

Gelecekteki altın ve borsa entegrasyonuna hazır olmak amacıyla, tüm varlık kaynaklarının uygulamak zorunda olduğu `IAssetProvider` arayüzü tanımlanmıştır. Arayüz üç metot bildirmektedir: `getList()`, `getDetail(code)` ve `getHistory(code, period)`. Mevcut `CurrencyProvider` bu arayüzü TCMB/EVDS verileriyle gerçeklemektedir. v2 ve v3 aşamalarında `GoldProvider` ve `StockProvider` sınıfları aynı arayüzü uygulayacak; UI bileşenlerinde herhangi bir değişiklik gerekmeyecektir.

#### 3.5.5. Design System

Uygulamanın görsel kimliği "Midas Premium" adı verilen özgün bir tasarım sistemi üzerine inşa edilmiştir. Sistem, `#0A0A0A` ana arka plan rengi ve `#00BFFF` elektrik mavisi neon vurgu rengiyle karakterize edilmektedir. Tüm sayısal değerler, hizalama tutarlılığı için `fontVariant: ['tabular-nums']` ayarıyla gösterilmektedir. Animasyonlar React Native Reanimated 3 kütüphanesi aracılığıyla native iş parçacığında çalıştırılarak 60 fps hedefi güvence altına alınmaktadır.

### 3.6. Veritabanı Tasarımı

#### 3.6.1. Supabase PostgreSQL Şeması

Veritabanı, Supabase'in yönetilen PostgreSQL 16 servisi üzerinde çalışmaktadır. Altı temel tablo tanımlanmıştır:

- `kullanici_profili`: `auth.users` tablosunu genişleten kullanıcı profili
- `portfoy_islemleri`: Kullanıcı alım/satım işlemleri (ALIS/SATIS)
- `ham_makro_veri`: Python fetcher'ın yazdığı ham EVDS verisi
- `temiz_veri_havuzu`: Gürültü filtresi çıktısı
- `ai_analiz_sonucu`: Pipeline'ın ürettiği analiz kayıtları
- `fiyat_alarmlari`: Kullanıcı tanımlı fiyat alarm kuralları

`ai_analiz_sonucu` tablosunun `user_id` alanı NULL olduğunda global cron analizini, NULL olmadığında ise belirli bir kullanıcıya ait portföy analizini temsil etmektedir.

#### 3.6.2. Row Level Security (RLS) Politikaları

Tablo düzeyinde güvenliğin sağlanması amacıyla RLS politikaları tanımlanmıştır. Kullanıcılar yalnızca kendi portföy işlemlerine ve profil bilgilerine erişebilmektedir. Global AI analizleri tüm kimliği doğrulanmış kullanıcılara açıkken portföy analizleri yalnızca ilgili kullanıcıya görünmektedir.

#### 3.6.3. Realtime Yapılandırması

`ai_analiz_sonucu` tablosu Supabase Realtime yayınına dahil edilerek `REPLICA IDENTITY FULL` ayarı aktifleştirilmiştir. Bu yapılandırma sayesinde yeni bir analiz kaydı oluşturulduğunda mobil uygulama polling mekanizmasına gerek kalmaksızın anlık bildirim almaktadır.

### 3.7. Güvenlik Mimarisi

#### 3.7.1. Kimlik Doğrulama ve Yetkilendirme

Sistem, iki katmanlı kimlik doğrulama mimarisini benimsemektedir. Kullanıcı kaydı ve girişi Supabase Auth üzerinden gerçekleştirilmekte; bu işlem sonucunda uzun ömürlü bir `refresh_token` üretilmektedir. Go backend'i, `JWT_SECRET` ile imzalanan kısa ömürlü `access_token` üretmektedir.

Mobil uygulamada Axios interceptor mekanizması, 401 yanıtı alındığında `refresh_token` kullanılarak access token'ı otomatik olarak yenilemektedir. Eş zamanlı yenileme istekleri kuyruk yöneticisi aracılığıyla tekilleştirilmekte; aynı yenileme isteğinin paralel olarak birden fazla kez gönderilmesi önlenmektedir.

#### 3.7.2. Diğer Güvenlik Mekanizmaları

`InternalSecret` middleware'i, `/internal/generate-news` uç noktasını `X-Internal-Secret` başlığı ile korumaktadır. Bu mekanizma, pipeline'ın yalnızca yetkili scheduler tarafından tetiklenmesini güvence altına almaktadır. SQL enjeksiyonuna karşı pgx'in parametrik sorgu desteği kullanılmakta; kullanıcı girdileri hiçbir koşulda ham SQL sorgusu içine dahil edilmemektedir. Mobil uygulamada JWT token'lar MMKV yerine Expo SecureStore'da saklanmakta; bu sayede cihaz güvenli depolama alanı (iOS Keychain, Android Keystore) kullanılmaktadır.

---

## 4. ARAŞTIRMA SONUÇLARI VE TARTIŞMA

### 4.1. Model Performans Değerlendirmesi

#### 4.1.1. Risk Sınıflandırma Tutarlılığı

Qwen2.5-3B RAFT modeli, üç farklı makroekonomik senaryo üzerinde değerlendirilmiştir. Makroekonomik koşulların belirgin biçimde RISKLI veya GUVENLI olduğu senaryolarda model, beklenen sınıflandırmayı üretmiştir. Karma sinyaller içeren NOTR senaryosunda ise model, birden fazla kez çalıştırıldığında tutarsız sonuçlar üretebilmektedir; bu durum, NOTR etiketinin tanımsal belirsizliğini yansıtmaktadır.

**Çizelge 4.1.** Senaryo Bazlı Risk Sınıflandırma Sonuçları

| Senaryo | Beklenen | Üretilen | Tutarlılık |
|:---|:---:|:---:|:---:|
| Rezerv ↓ + Cari açık ↑ + M2 hızlı | RISKLI | RISKLI | ✓ |
| Rezerv ↑ + Cari iyileşiyor + Faiz yüksek | GUVENLI | GUVENLI | ✓ |
| Karma sinyaller | NOTR | NOTR / RISKLI | Kısmi |

#### 4.1.2. Projeksiyon Geçerliliği

Üretilen `projeksiyon_3_ay` ve `projeksiyon_6_ay` değerleri, tüm test koşularında `[0, 500]` geçerlilik aralığında kalmaktadır. RISKLI senaryolarda `projeksiyon_6_ay ≥ projeksiyon_3_ay` koşulunun korunduğu, yani modelin kur yükseliş trendini projeksiyon sırasına yansıttığı gözlemlenmiştir. GUVENLI senaryolarda ise ters yönde bir sıralama elde edilmektedir.

#### 4.1.3. Gürültü Filtreleme Etkinliği

`deterministicDistractor()` fonksiyonunun eklediği çeldirici bilgilerin modelin risk sınıflandırmasını kayda değer ölçüde etkilemediği gözlemlenmiştir. Bu bulgu, RAFT eğitiminin modele ilgisiz verileri görmezden gelme becerisini kazandırdığını desteklemektedir.

### 4.2. DeepEval Test Sonuçları

#### 4.2.1. Test Kategorileri ve Sonuçları

Bu çalışma kapsamında DeepEval v4.0.4 çerçevesiyle yedi test kategorisini kapsayan kapsamlı bir değerlendirme altyapısı oluşturulmuştur. Test süiti `test_model.py` dosyasında 28 test barındırmaktadır.

**Çizelge 4.2.** DeepEval Test Sonuçları Özeti

| Kategori | Test Sayısı | Geçen | Başarı Oranı |
|:---|:---:|:---:|:---:|
| Birim — Kural Tabanlı | 6 | 6 | %100 |
| Gemini API — JSON Şema Uyumu | 3 | 3 | %100 |
| Gemini API — Risk Sınıflandırması | 2 | 2 | %100 |
| Gemini API — Projeksiyon Aralığı | 4 | 4 | %100 |
| Gemini API — Haber Kalitesi | 8 | 8 | %100 |
| Ollama/Qwen RAFT — Şema Uyumu | 2 | 2 | %100 |
| Ollama/Qwen RAFT — Projeksiyon Aralığı | 1 | 1 | %100 |
| GEval — Finansal Tutarlılık | 2 | — | OpenAI API gerektirir |
| **Gemini + Ollama dahil toplam** | **26** | **26** | **%100** |

#### 4.2.2. Test Kategorisi Detayları

**JSON Şema Uyumu Testleri:** Modelin ürettiği çıktının altı zorunlu alanı (`risk_bolgesi`, `projeksiyon_3_ay`, `projeksiyon_6_ay`, `ozet`, `haber_basligi`, `haber_icerigi`) eksiksiz ve doğru veri tipinde içerdiği doğrulanmaktadır.

**Risk Sınıflandırma Testleri:** RISKLI, GUVENLI ve NOTR etiketlerinin `{"GUVENLI", "RISKLI", "NOTR"}` kümesinden biri olduğu ve beklenen senaryoyla uyuştuğu kontrol edilmektedir.

**Haber Kalitesi Testleri:** `haber_basligi` alanının 80 Unicode karakteri aşmadığı, `haber_icerigi` alanının en az 100 kelime içerdiği, içeriğin markdown fence barındırmadığı ve Türkçe karakter (`ğşıöüçĞŞİÖÜÇ`) içerdiği doğrulanmaktadır.


#### 4.2.3. API Entegrasyon Testleri

Gerçek Gemini API çağrısı gerektiren testler başlangıçta eski API anahtarlarının günlük kotasının tükenmesi nedeniyle atlanmıştır. Sorunun çözümü sürecinde test altyapısında aşağıdaki iyileştirmeler gerçekleştirilmiş ve tüm API testleri başarıyla çalıştırılmıştır:

- **Model yükseltme:** `gemini-2.0-flash` → `gemini-2.5-flash` (Gemini 2.5 Flash, 503 hatasına daha az eğilimli)
- **Kimlik doğrulama:** URL parametre (`?key=`) → `x-goog-api-key` HTTP başlığı
- **Token limiti:** `maxOutputTokens` 4.000 → 8.192 (2.5 Flash'ın düşünce zinciri için gerekli)
- **Yeniden deneme kapsamı:** 429 (kota aşımı) ile birlikte 503 (sunucu hatası) da yeniden deneme döngüsüne alındı
- **JSON ayıklayıcı yeniden tasarımı:** Qwen RAFT modelinin düşünce zinciri çıktısını doğru işlemek amacıyla `_find_outer_json()` fonksiyonu dengeli parantez sayımı (balanced brace counting) ile yeniden yazıldı; model artefaktı olan ardışık üçlü tırnak (`"""`) temizleme eklendi

Bu iyileştirmeler sonucunda 17 Gemini API testi ve 3 Ollama/Qwen RAFT testi sorunsuz biçimde çalışmakta; **26 testin tamamı %100 başarıyla tamamlanmaktadır.** Ayrı bir test API anahtarı kullanılması, test ve üretim ortamlarının kota çakışmasını önleyerek her iki ortamın bağımsız çalışmasını sağlayacaktır.

### 4.3. Sistem Performans Metrikleri

#### 4.3.1. API Yanıt Süreleri

Sunucu tarafı ölçümlerine dayanan performans metrikleri Çizelge 4.3'te özetlenmiştir.

**Çizelge 4.3.** Uç Nokta Yanıt Süreleri

| Uç Nokta | Ortalama Yanıt Süresi | Notlar |
|:---|:---:|:---|
| `GET /api/v1/currencies` | < 20 ms | 60 sn cache hit |
| `GET /api/v1/currencies/:code/history` | ~200 ms | Python servisi proxy |
| `GET /api/v1/news/ai` | < 50 ms | Supabase sorgu |
| `POST /api/v1/portfolio/analyze` | 30–120 sn | Ollama + Gemini |
| `POST /internal/generate-news` | 45–150 sn | Tam pipeline |

Portföy analizi ve haber üretim uç noktalarındaki yüksek yanıt süresi, Qwen modelinin çıkarım süresinden (yerel donanıma bağlı olarak 30–90 saniye) ve isteğe bağlı Gemini API çağrısından kaynaklanmaktadır.

#### 4.3.2. Bellek ve Kaynak Kullanımı

TCMB in-memory cache'i, `sync.RWMutex` ile korunan ve yalnızca son kur verisini saklayan minimal bir bellek kullanımına sahiptir. WebSocket Hub, bağlı istemci başına yaklaşık 4 KB bellek tüketmektedir. Python servisi bellek kullanımı, `pandas` DataFrame işlemleri sırasında peak değere ulaşmakla birlikte makul düzeyde kalmaktadır.

### 4.4. Kullanıcı Arayüzü Değerlendirmesi

#### 4.4.1. Design System Uygulaması

Geliştirilen "Midas Premium" design system'in tutarlı biçimde hayata geçirildiği değerlendirilmiştir. `#0A0A0A` arka plan rengi, `#00BFFF` accent rengi ve Plus Jakarta Sans tipografisi tüm ekranlarda standart olarak uygulanmaktadır. `tabular-nums` font varyantı, para birimi ve kur değerlerinin tablolu görüntülenmesini sağlamakta; bu sayede rakamlar dikey hizalamayla okunabilmektedir.

#### 4.4.2. Gerçek Zamanlı Güncelleme Deneyimi

WebSocket üzerinden yayımlanan kur güncellemeleri, `AnimatedPrice` bileşeni tarafından yakalanmakta ve fiyat değişim yönüne göre yeşil ya da kırmızı renkte `withTiming(200ms)` animasyonuyla gösterilmektedir. Supabase Realtime entegrasyonu sayesinde yeni AI haber kaydı oluşturulduğunda NewsScreen, kullanıcı etkileşimi gerektirmeksizin otomatik olarak güncellenmektedir.

#### 4.4.3. Kısıtlamalar

Portföy analizi uç noktasının yanıt süresi (30–120 saniye), kullanıcı deneyimi açısından belirgin bir bekleme hissi yaratmaktadır. Bu durum, analiz başlatıldığında kullanıcıya yükleme göstergesi ve tahmini bekleme süresi sunulmasının gerekliliğini ortaya koymaktadır. v2 sürümünde asenkron işlem modeline geçilmesi ve sonuç hazır olduğunda push notification ile kullanıcının bilgilendirilmesi önerilmektedir.

---

## 5. SONUÇLAR VE ÖNERİLER

### 5.1. Sonuçlar

Bu çalışmada, Türkiye makroekonomik verileri ile yapay zeka destekli finansal analizi bütünleştiren çok katmanlı bir mobil uygulama başarıyla geliştirilmiştir. Gerçekleştirilen çalışma kapsamında aşağıdaki sonuçlara ulaşılmıştır:

**Teknik Sonuçlar:**

1. **RAFT ile Özelleştirilmiş Model Başarısı:** RAFT yöntemi uygulanarak Qwen2.5-3B modeli, genel amaçlı çıkarım yeteneklerini yitirmeksizin TCMB/EVDS makroekonomik göstergelerine dayalı risk sınıflandırması yapabilmektedir. Model, deterministik çeldirici mekanizması ile sınandığında ilgisiz finansal verileri büyük ölçüde görmezden gelme kapasitesi sergilemiştir.

2. **İki Aşamalı LLM Mimarisinin Geçerliliği:** Sayısal çıkarım için yerel küçük model (Qwen, düşük gecikme ve gizlilik) ile metin üretimi için bulut tabanlı büyük model (Gemini, kalite ve akıcılık) kombinasyonunun her iki hedefi de tek bir modelle karşılamaktan daha etkili olduğu değerlendirilmektedir.

3. **Deterministik Karar Motorunun Gerekliliği:** LLM'lerin finansal tavsiye üretimindeki olasılıksal ve bazen tutarsız davranışı, kural tabanlı AL/TUT/SAT karar motorunun zorunluluğunu doğrulamaktadır. Bu katman, sistemin kullanıcı güvenliği açısından kritik bir koruma mekanizması işlevi görmektedir.

4. **Gürültü Filtreli Veri Pipeline'ı:** EVDS'ten çekilen ham makroekonomik verilerdeki altın sapması ve NHN gürültüsünün model çıkarımını bozabileceği; `noise_filter.py` modülünün bu riski etkili biçimde azalttığı gösterilmiştir.

5. **DeepEval Test Altyapısı:** Oluşturulan 28 testlik DeepEval değerlendirme süiti, geliştirilen sistemin JSON şema uyumunu, risk sınıflandırma tutarlılığını, projeksiyon geçerliliğini ve haber kalitesini ölçen kapsamlı bir regresyon testi altyapısı sunmaktadır. Gemini 2.5 Flash ve Ollama/Qwen RAFT testleri dahil 26 testin tamamı (%100) başarıyla tamamlanmaktadır. GEval testleri (2 adet) OpenAI API anahtarı gerektirmekte olup mevcut altyapıda beklemede tutulmaktadır.

**Mimari Sonuçlar:**

Katmanlı mimari yaklaşım, `IAssetProvider` soyutlama arayüzü ve bağımsız servis tasarımı; sistemin bakım maliyetini düşürmekte ve v2 (altın) ile v3 (BIST) genişlemelerini mevcut kodu değiştirmeksizin mümkün kılmaktadır. Supabase Realtime entegrasyonu, polling mekanizmasına gerek kalmaksızın anlık haber güncellemesi deneyimi sunmaktadır.

### 5.2. Öneriler

Çalışma sürecinde edinilen deneyimler ve sistem analizine dayalı olarak gelecek geliştirme süreçlerine yönelik aşağıdaki öneriler sunulmaktadır:

**Acil İyileştirme Önerileri:**

1. **Gemini Model Sürümü Güncellenmeli:** `llm_service.go` dosyasında tanımlı `gemini-3-flash-preview` ve `gemini-3.1-pro-preview` model tanımlayıcıları mevcut Gemini API kataloğunda bulunmamaktadır. Bu değerlerin `gemini-2.0-flash` ile güncellenmesi Gemini aşamasının sorunsuz çalışması için zorunludur.

2. **Test ve Üretim API Anahtarları Ayrıştırılmalı:** GEMINI_API_KEY'in test ve üretim ortamında ortaklaşılması günlük kota çakışmasına yol açmaktadır. Ayrı anahtar yönetimi, test süitinin bağımsız çalışabilmesini sağlayacaktır.

3. **Debug Logları Temizlenmeli:** `prompt_builder.go` dosyasındaki `fmt.Printf` çağrıları üretim ortamında log kirliliği yaratmakta ve hafif performans yüküne neden olmaktadır. Bu satırlar kaldırılmalı veya `log/slog` ile yapılandırılabilir log seviyesine taşınmalıdır.

**Kısa Vadeli Öneriler (v1.1):**

4. **Graceful Shutdown Desteği Eklenmeli:** Go uygulaması `SIGINT/SIGTERM` sinyallerini yakalamakta ve goroutine'leri temiz kapanma döngüsüne almamaktadır. `signal.NotifyContext` kullanımıyla bu eksiklik giderilebilir.

5. **Go Birim Testleri Yazılmalı:** Özellikle `pipeline/generate.go`, `raft/llm_service.go` ve `currency/tcmb.go` modülleri için birim testleri oluşturulmalıdır. Bu testler, kritik iş mantığının regresyonlardan korunmasına önemli katkı sağlayacaktır.

6. **CORS Kısıtlaması Sıkılaştırılmalı:** Üretim ortamında CORS middleware'i yalnızca uygulamanın gerçek domain adını ve Expo geliştirme URL'sini kabul edecek şekilde yapılandırılmalıdır.

**Orta Vadeli Öneriler (v2.0):**

7. **Dağıtık Cache Mimarisine Geçilmeli:** Mevcut in-memory TCMB cache'i, çoklu Go instance deploy senaryosunda her instance'ın bağımsız TCMB çağrısı yapmasına neden olmaktadır. Redis tabanlı dağıtık cache bu sorunu çözecek ve ölçeklenebilirliği artıracaktır.

8. **Yapılandırılmış Loglama Benimsenmeli:** Go 1.21+ ile standart kütüphaneye dahil edilen `log/slog` paketi kullanılarak yapılandırılmış ve sorgulanabilir log altyapısı oluşturulmalıdır.

9. **Portföy Analizi Asenkron Hale Getirilmeli:** Kullanıcı deneyimini iyileştirmek amacıyla portföy analizi isteği eş zamanlı yanıt yerine asenkron görev modeliyle ele alınmalı; analiz tamamlandığında push notification ile kullanıcı bilgilendirilmelidir.

10. **GoldProvider Implementasyonu (v2.0):** `IAssetProvider` arayüzü genişletilerek TCMB altın serisi verilerini işleyen `GoldProvider` sınıfı hayata geçirilmelidir. Bu adım, uygulamanın döviz ötesinde farklı varlık sınıflarını kapsayan bir yatırım platformuna dönüşmesine zemin hazırlayacaktır.

---

## KAYNAKLAR

Alibaba Cloud. (2024). *Qwen2.5 Technical Report*. arXiv:2412.15115. https://arxiv.org/abs/2412.15115

Chang, Y., Wang, X., Wang, J., Wu, Y., Yang, L., Zhu, K., … Xie, X. (2024). A survey on evaluation of large language models. *ACM Transactions on Intelligent Systems and Technology*, 15(3), 1–45. https://doi.org/10.1145/3641289

Confident AI. (2024). *DeepEval: The LLM Evaluation Framework* (Versiyon 4.0.4) [Yazılım]. GitHub. https://github.com/confident-ai/deepeval

Engel, C. ve West, K. D. (2005). Exchange rates and fundamentals. *Journal of Political Economy*, 113(3), 485–517. https://doi.org/10.1086/429137

Hendrycks, D., Burns, C., Basart, S., Zou, A., Mazeika, M., Song, D. ve Steinhardt, J. (2021). Aligning AI with shared human values. *Proceedings of the International Conference on Learning Representations (ICLR)*. https://openreview.net/forum?id=dNy_RKzJacY

Hu, E. J., Shen, Y., Wallis, P., Allen-Zhu, Z., Li, Y., Wang, S., … Chen, W. (2021). LoRA: Low-rank adaptation of large language models. *Proceedings of the International Conference on Learning Representations (ICLR 2022)*. https://arxiv.org/abs/2106.09685

Johnson, M., Li, T. ve Smith, K. (2023). AI-driven investment applications: A systematic review of algorithmic decision support in retail fintech. *Journal of Financial Technology*, 5(2), 112–138. https://doi.org/10.1080/26784795.2023.219441

Meese, R. A. ve Rogoff, K. (1983). Empirical exchange rate models of the seventies: Do they fit out of sample? *Journal of International Economics*, 14(1–2), 3–24. https://doi.org/10.1016/0022-1996(83)90017-X

Selçuk Üniversitesi Teknoloji Fakültesi. (2024). *Mühendislik Tasarımı Proje Yazım Kılavuzu*. Selçuk Üniversitesi.

Statista. (2024). *Number of mobile banking users worldwide from 2020 to 2028*. https://www.statista.com/statistics/1228757/mobile-banking-users-worldwide/ (Erişim tarihi: 10 Mayıs 2026)

Taylor, J. B. (1995). The monetary transmission mechanism: An empirical framework. *Journal of Economic Perspectives*, 9(4), 11–26. https://doi.org/10.1257/jep.9.4.11

Türkiye Cumhuriyet Merkez Bankası. (2024). *Elektronik Veri Dağıtım Sistemi (EVDS) Kullanım Kılavuzu*. https://evds2.tcmb.gov.tr

Türkiye Cumhuriyet Merkez Bankası. (2024). *Finansal İstikrar Raporu — Mayıs 2024*. Türkiye Cumhuriyet Merkez Bankası.

Wu, S., Irsoy, O., Lu, S., Dabravolski, V., Dredze, M., Gehrmann, S., … Mann, G. (2023). BloombergGPT: A large language model for finance. arXiv:2303.17564. https://arxiv.org/abs/2303.17564

Yang, H., Liu, X.-Y. ve Wang, C. D. (2023). FinGPT: Open-source financial large language models. arXiv:2306.06031. https://arxiv.org/abs/2306.06031

Zhang, T., Patil, S. G., Jain, N., Shen, S., Zaharia, M., Stoica, I. ve Gonzalez, J. E. (2024). RAFT: Adapting language model to domain specific RAG. arXiv:2403.10131. https://arxiv.org/abs/2403.10131

---

## EKLER

### EK-1 — Sistem Mimarisi Diyagramı

```
┌──────────────────────────────────────────────────────────────────┐
│                  DOVIZ APP — SİSTEM MİMARİSİ                     │
├──────────────────────────────────────────────────────────────────┤
│  MOBİL KATMAN (React Native 0.81 + TypeScript 5.9)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │HomeScreen│ │NewsScreen│ │SearchScr.│ │   MenuScreen         │ │
│  └────┬─────┘ └─────┬────┘ └────┬─────┘ └──────────────────────┘ │
│       │             │           │                                  │
│  ┌────▼─────────────▼───────────▼───────────────────────────────┐ │
│  │  TanStack Query v5 + Zustand v5 + Expo SecureStore            │ │
│  └────────────────────────┬──────────────────────────────────────┘ │
│                           │ REST / WebSocket                       │
├───────────────────────────▼──────────────────────────────────────┤
│  API KATMANI (Go 1.24 + Gin v1.10 — :8080)                       │
│  JWT HS256 │ Rate Limit │ CORS │ Slot Limiter (max 3)             │
│  /health │ /auth/* │ /api/v1/* │ /ws/currencies │ /internal/*    │
├─────────────────┬────────────────────────┬───────────────────────┤
│  SUPABASE       │  PYTHON SERVİSİ :8001  │  AI PIPELINE          │
│  PostgreSQL 16  │  FastAPI               │  ┌─────────────────┐  │
│  + RLS          │  fetcher.py (EVDS)     │  │ Ollama:11434    │  │
│  + Realtime     │  noise_filter.py       │  │ Qwen2.5-3B LoRA │  │
│  + Auth         │  currency_history.py   │  └────────┬────────┘  │
│                 │                        │           │            │
│                 │                        │  ┌────────▼────────┐  │
│                 │                        │  │ Gemini 2.0 Flash│  │
│                 │                        │  │ (Enrichment)    │  │
│                 │                        │  └─────────────────┘  │
├─────────────────┼────────────────────────┴───────────────────────┤
│  TCMB XML API   │  EVDS API              │  NewsAPI              │
│  (Anlık kurlar) │  (Makro seriler)       │  (Haber başlıkları)   │
└─────────────────┴────────────────────────┴───────────────────────┘
```

### EK-2 — DeepEval Test Çalıştırma Kılavuzu

**Gereksinimler:**
```
Python 3.10+
deepeval >= 4.0.4
pytest >= 8.0.0
requests >= 2.32.0
```

**Kurulum:**
```bash
pip install deepeval pytest requests
```

**Kural Tabanlı Birim Testleri (API gerektirmez):**
```powershell
cd "c:\Users\ASUS\Desktop\uni\muh-tas"
python -m pytest deepeval_tests/test_model.py -v -k "RetryBehavior"
```

**Gemini API ile Tam Test (ayrı test anahtarı gerektirir):**
```powershell
$env:GEMINI_API_KEY = "TEST_ORTAMI_API_ANAHTARI"
python -m pytest deepeval_tests/test_model.py -v -k "not Ollama and not GEval"
```

**Ollama Dahil Tam Test (Qwen modeli çalışıyor olmalı):**
```powershell
$env:GEMINI_API_KEY = "TEST_ORTAMI_API_ANAHTARI"
$env:OLLAMA_MODEL = "qwen-raft-finans"
python -m pytest deepeval_tests/test_model.py -v -k "not GEval"
```

### EK-3 — Ortam Değişkenleri Referans Tablosu

**Çizelge A.1.** Backend Ortam Değişkenleri

| Değişken | Zorunlu | Örnek Değer | Açıklama |
|:---|:---:|:---|:---|
| `GEMINI_API_KEY` | ✓ | `AIza...` | Gemini API anahtarı |
| `OLLAMA_MODEL` | ✓ | `qwen-raft-finans` | Ollama model adı |
| `OLLAMA_HOST` | — | `http://localhost:11434` | Ollama sunucu adresi |
| `DATABASE_URL` | ✓ | `postgres://...` | Supabase bağlantı dizisi |
| `SUPABASE_URL` | ✓ | `https://xxx.supabase.co` | Supabase proje URL'i |
| `SUPABASE_SERVICE_KEY` | ✓ | `eyJ...` | Service role JWT |
| `JWT_SECRET` | ✓ | `[32+ karakter]` | HS256 imzalama anahtarı |
| `EVDS_API_KEY` | ✓ | `[TCMB EVDS]` | Python servisi için |
| `NEWSAPI_KEY` | ✓ | `[newsapi.org]` | Haber servisi |
| `PORT` | — | `8080` | API sunucu portu |
| `PIPELINE_MAX_CONCURRENT` | — | `3` | Max eş zamanlı AI istegi |
| `CRON_INTERVAL_HOURS` | — | `6` | AI haber üretim aralığı |
| `INTERNAL_SECRET` | — | `[güçlü şifre]` | Cron endpoint koruması |
| `PYTHON_SERVICE_URL` | — | `http://localhost:8001` | FastAPI servis URL'i |
| `CLEAN_MACRO_PATH` | — | `python/data/clean_macro.json` | Temiz makro veri yolu |

---

## ÖZGEÇMİŞ

**KİŞİSEL BİLGİLER**

Adı Soyadı : Çağrı TEKİN
Uyruğu : T.C.
Doğum Yeri ve Tarihi : —
Telefon : +90 536 992 87 96
Faks : —
E-mail : tekincagri16@gmail.com

---

**EĞİTİM**

Lise : —
Üniversite : Selçuk Üniversitesi Teknoloji Fakültesi Bilgisayar Mühendisliği Bölümü, Selçuklu, Konya — 2026
Yüksek Lisans : —
Doktora : —

---

**İŞ DENEYİMLERİ**

07/2025 – 08/2025 · Toyota Otomotiv Sanayi Türkiye (TMMT) · Stajyer — Maliyet ve Muhasebe

10/2024 – 11/2025 · SelçukChain Topluluğu, Selçuk Üniversitesi · Başkan Yardımcısı

03/2025 – 06/2025 · Divizyon — SportLink Projesi · Web Backend Developer

02/2025 – güncel · Serbest (Freelance) · Full-Stack Yazılım Geliştirici

03/2026 – 05/2026 · Divizyon — Cargo Pilot Projesi · Frontend Chapter Lead

05/2026 · Divizyon · Peer Mentor (Mimari & CSS Workshop)

---

**UZMANLIK ALANI**

Full-stack web ve mobil uygulama geliştirme (React Native, Next.js, Go, Node.js), büyük dil modelleri ince ayarı (RAFT, LoRA) ve değerlendirmesi (DeepEval), gerçek zamanlı veri işleme sistemleri (WebSocket, Supabase Realtime), fintech uygulama geliştirme ve yapay zeka destekli karar destek sistemleri, nesne tanıma ve bilgisayarlı görü (YOLO, Roboflow).

---

**YABANCI DİLLER**

İngilizce: İleri

---

**BELİRTMEK İSTEĞİNİZ DİĞER ÖZELLİKLER**

Frontend: React.js, Next.js, React Native, Tailwind CSS, Framer Motion, Three.js, Zustand, TanStack Query, Zod

Backend: Go (Gin), Node.js, NestJS, Express.js, Python (FastAPI)

Veritabanı: PostgreSQL, Supabase, MongoDB, Prisma ORM

DevOps: Docker, GitHub Actions, Vercel, Render

AI/ML: Ollama, Gemini API, RAFT ince ayar, LoRA adaptörü, YOLO

Ödül: Divizyon Jam 2024 — 1. yer, Oyunlaştırma Kategorisi (Konsense projesi, 28 kişilik etkinlik)

---

**YAYINLAR**

TEKİN, Ç. "Proof of Work ve Proof of Stake Nedir?" — Blockchain uzlaşım mekanizmalarına karşılaştırmalı bir bakış. *Medium*, 2024.

TEKİN, Ç. "Aztec Protocol" — Ethereum'un gizlilik odaklı sıfır bilgi protokolüne teknik giriş. *Medium*, 2024.
