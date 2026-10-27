// cursorrules §3.2: Service katmanı — UI'dan çağrılır, doğrudan fetch yasak.
import { z } from 'zod';
import axios from 'axios';
import { apiClient } from './api';

// cursorrules §3.5: API yanıtı için ayrı DTO tipi.
const LoginResponseSchema = z.object({
  ok: z.boolean(),
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
});

export type LoginDTO = z.infer<typeof LoginResponseSchema>;

export async function login(email: string, password: string): Promise<LoginDTO> {
  try {
    const res = await apiClient.post('/auth/login', { email, password });
    const parsed = LoginResponseSchema.safeParse(res.data);
    if (!parsed.success || !parsed.data.ok) {
      throw new Error('Giriş yanıtı beklenen formatta değil');
    }
    return parsed.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const apiError = err.response?.data?.error;
      if (typeof apiError === 'string' && apiError.trim() !== '') {
        throw new Error(apiError);
      }
      if (err.response?.status === 401) {
        throw new Error('E-posta veya şifre hatalı');
      }
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Giriş başarısız');
  }
}

// Demo login — backend'den gerçek 24 saatlik JWT alır, Supabase hesabı gerekmez.
export async function demoLogin(): Promise<LoginDTO> {
  try {
    const res = await apiClient.post('/auth/demo');
    const parsed = LoginResponseSchema.safeParse(res.data);
    if (!parsed.success || !parsed.data.ok) {
      throw new Error('Demo token alınamadı');
    }
    return parsed.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const apiError = err.response?.data?.error;
      if (typeof apiError === 'string' && apiError.trim() !== '') {
        throw new Error(apiError);
      }
    }
    if (err instanceof Error) throw err;
    throw new Error('Demo giriş başarısız');
  }
}

export async function register(email: string, password: string): Promise<void> {
  try {
    const res = await apiClient.post('/auth/register', { email, password });
    const ok = Boolean(res.data?.ok);
    if (!ok) {
      const msg = typeof res.data?.error === 'string' ? res.data.error : 'Kayıt başarısız';
      throw new Error(msg);
    }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const apiError = err.response?.data?.error;
      if (typeof apiError === 'string' && apiError.trim() !== '') {
        throw new Error(apiError);
      }
      if (err.response?.status === 400) {
        throw new Error('Kayıt isteği geçersiz. E-posta/şifre bilgilerini kontrol et.');
      }
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Kayıt başarısız');
  }
}
