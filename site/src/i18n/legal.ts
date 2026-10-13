import ar from '@/content/legal/ar.json';
import en from '@/content/legal/en.json';
import type { Locale } from './index';

export type LegalDict = typeof en;
export type LegalKey = 'terms' | 'privacy' | 'riceTerms';
export const getLegal = (locale: Locale): LegalDict => (locale === 'ar' ? (ar as LegalDict) : en);
