-- AI analiz tablosuna portföy analizi kolonları ekleniyor
-- Mevcut global (cron) kayıtlar için yeni kolonlar NULL kalabilir

ALTER TABLE public.ai_analiz_sonucu
  ADD COLUMN IF NOT EXISTS doviz_onerileri    jsonb,      -- Qwen AL/TUT/SAT kararları
  ADD COLUMN IF NOT EXISTS portfoy_aciklamasi text,       -- Gemini portföy açıklaması
  ADD COLUMN IF NOT EXISTS doviz_aciklamalari jsonb,      -- Gemini döviz bazlı açıklamalar
  ADD COLUMN IF NOT EXISTS user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Kullanıcıya özgü analizler için performans index'i
CREATE INDEX IF NOT EXISTS idx_ai_analiz_user_id
  ON public.ai_analiz_sonucu(user_id, uretim_tarihi DESC);

-- NULL user_id = global (cron) analiz, değer = kullanıcıya özgü analiz
COMMENT ON COLUMN public.ai_analiz_sonucu.user_id IS
  'NULL: global cron analizi; değer: kullanıcıya özgü portföy analizi';

COMMENT ON COLUMN public.ai_analiz_sonucu.doviz_onerileri IS
  'Qwen modelinin AL|TUT|SAT kararları — [{doviz_kodu, oneri, gerekce}]';

COMMENT ON COLUMN public.ai_analiz_sonucu.doviz_aciklamalari IS
  'Gemini kullanıcı dostu açıklamalar — [{doviz_kodu, oneri, aciklama}]';
