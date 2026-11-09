import data from './site.json';

/** Contact data (ported from MEDADX_DATA) plus organisation facts used in structured data. */
export const SITE_DATA = data;

/**
 * Used in the footer and in Organization `sameAs`. x.com/medadx was removed on 2026-11-08:
 * X reported "User Profile Not Found". LinkedIn/Instagram block automated checks: confirm them.
 */
export const SOCIALS = {
  linkedin: 'https://www.linkedin.com/company/medad-x',
  instagram: 'https://www.instagram.com/medadx',
} as const;

export const ORG = {
  name: 'Medad-X',
  legalName: 'Medad-X General Trading',
  parent: 'Arsan Global Group',
  telephone: '+966558422443',
  email: data.email,
  address: {
    streetAddress: 'Port Gate Building, Khalidiya Junubiya',
    addressLocality: 'Dammam',
    addressRegion: 'Eastern Province',
    addressCountry: 'SA',
  },
  /** "Port Gate" building, Khalidiya Junubiya (OpenStreetMap way 721777635). */
  geo: { latitude: 26.4145, longitude: 50.15985 },
  areaServed: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'IQ', 'LB', 'YE', 'EG', 'MA', 'DZ', 'LY'],
} as const;
