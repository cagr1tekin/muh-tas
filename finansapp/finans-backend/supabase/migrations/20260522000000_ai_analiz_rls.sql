-- ai_analiz_sonucu tablosu için RLS politikaları
-- service_role ile INSERT/SELECT yapabilmek için

-- Service role her şeyi yapabilir (backend tarafından kullanılır)
CREATE POLICY "service_role_all" ON public.ai_analiz_sonucu
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated kullanıcılar kendi analizlerini okuyabilir
CREATE POLICY "user_read_own" ON public.ai_analiz_sonucu
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
