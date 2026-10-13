import data from './site.json';

/** Contact data (ported from MEDADX_DATA) plus organisation facts used in structured data. */
export const SITE_DATA = data;

export const SOCIALS = {
  linkedin: 'https://www.linkedin.com/company/medad-x',
  instagram: 'https://www.instagram.com/medadx',
  x: 'https://x.com/medadx',
} as const;

export const ORG = {
  name: 'Medad-X',
  legalName: 'Medad-X General Trading',
  parent: 'Arsan Global Group',
  telephone: '+966920009050',
  email: data.email,
  address: {
    streetAddress: 'Port Gate Building, Khalidiya Junubiya',
    addressLocality: 'Dammam',
    addressRegion: 'Eastern Province',
    addressCountry: 'SA',
  },
  areaServed: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'IQ', 'LB', 'YE', 'EG', 'MA', 'DZ', 'LY'],
} as const;
