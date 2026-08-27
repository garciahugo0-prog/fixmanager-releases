/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * FixManager — Base de datos global y utilidades de internacionalización (países, monedas, prefijos e impuestos)
 */

export interface CountryInfo {
  code: string;           // Prefijo telefónico internacional con signo + (ej. '+54')
  dialCode: string;       // Dígitos limpios sin + (ej. '54')
  iso: string;            // Código ISO de 2 letras (ej. 'AR')
  flag: string;           // Emoji de bandera
  name: string;           // Nombre del país en español
  currencySymbol: string; // Símbolo de moneda sugerido (ej. '$', 'USD $', '€', 'S/.')
  currencyName: string;   // Nombre descriptivo de la moneda
  defaultTaxRate: number; // Tasa de impuesto por defecto (ej. 0.21 para 21%)
  taxLabel: string;       // Etiqueta del impuesto (ej. 'I.V.A (21%)', 'I.G.V (18%)')
  phonePlaceholder?: string; // Ejemplo de formato de número de teléfono
}

export const COUNTRY_LIST: CountryInfo[] = [
  {
    code: '+54',
    dialCode: '54',
    iso: 'AR',
    flag: '🇦🇷',
    name: 'Argentina',
    currencySymbol: '$',
    currencyName: 'Peso Argentino (ARS)',
    defaultTaxRate: 0.21,
    taxLabel: 'I.V.A (21%)',
    phonePlaceholder: '(11) 2345-6789'
  },
  {
    code: '+52',
    dialCode: '52',
    iso: 'MX',
    flag: '🇲🇽',
    name: 'México',
    currencySymbol: '$',
    currencyName: 'Peso Mexicano (MXN)',
    defaultTaxRate: 0.16,
    taxLabel: 'I.V.A (16%)',
    phonePlaceholder: '(351) 157-4876'
  },
  {
    code: '+1',
    dialCode: '1',
    iso: 'US',
    flag: '🇺🇸',
    name: 'Estados Unidos',
    currencySymbol: 'USD $',
    currencyName: 'Dólar Estadounidense (USD)',
    defaultTaxRate: 0.08,
    taxLabel: 'Sales Tax (8%)',
    phonePlaceholder: '(555) 123-4567'
  },
  {
    code: '+57',
    dialCode: '57',
    iso: 'CO',
    flag: '🇨🇴',
    name: 'Colombia',
    currencySymbol: '$',
    currencyName: 'Peso Colombiano (COP)',
    defaultTaxRate: 0.19,
    taxLabel: 'I.V.A (19%)',
    phonePlaceholder: '(300) 123-4567'
  },
  {
    code: '+56',
    dialCode: '56',
    iso: 'CL',
    flag: '🇨🇱',
    name: 'Chile',
    currencySymbol: '$',
    currencyName: 'Peso Chileno (CLP)',
    defaultTaxRate: 0.19,
    taxLabel: 'I.V.A (19%)',
    phonePlaceholder: '(9) 1234-5678'
  },
  {
    code: '+51',
    dialCode: '51',
    iso: 'PE',
    flag: '🇵🇪',
    name: 'Perú',
    currencySymbol: 'S/.',
    currencyName: 'Sol Peruano (PEN)',
    defaultTaxRate: 0.18,
    taxLabel: 'I.G.V (18%)',
    phonePlaceholder: '(987) 654-321'
  },
  {
    code: '+34',
    dialCode: '34',
    iso: 'ES',
    flag: '🇪🇸',
    name: 'España',
    currencySymbol: '€',
    currencyName: 'Euro (€)',
    defaultTaxRate: 0.21,
    taxLabel: 'I.V.A (21%)',
    phonePlaceholder: '(612) 345-678'
  },
  {
    code: '+593',
    dialCode: '593',
    iso: 'EC',
    flag: '🇪🇨',
    name: 'Ecuador',
    currencySymbol: 'USD $',
    currencyName: 'Dólar (USD)',
    defaultTaxRate: 0.15,
    taxLabel: 'I.V.A (15%)',
    phonePlaceholder: '(099) 123-4567'
  },
  {
    code: '+502',
    dialCode: '502',
    iso: 'GT',
    flag: '🇬🇹',
    name: 'Guatemala',
    currencySymbol: 'Q',
    currencyName: 'Quetzal (GTQ)',
    defaultTaxRate: 0.12,
    taxLabel: 'I.V.A (12%)',
    phonePlaceholder: '(5123) 4567'
  },
  {
    code: '+591',
    dialCode: '591',
    iso: 'BO',
    flag: '🇧🇴',
    name: 'Bolivia',
    currencySymbol: 'Bs',
    currencyName: 'Boliviano (BOB)',
    defaultTaxRate: 0.13,
    taxLabel: 'I.V.A (13%)',
    phonePlaceholder: '(712) 34567'
  },
  {
    code: '+598',
    dialCode: '598',
    iso: 'UY',
    flag: '🇺🇾',
    name: 'Uruguay',
    currencySymbol: '$',
    currencyName: 'Peso Uruguayo (UYU)',
    defaultTaxRate: 0.22,
    taxLabel: 'I.V.A (22%)',
    phonePlaceholder: '(099) 123-456'
  },
  {
    code: '+595',
    dialCode: '595',
    iso: 'PY',
    flag: '🇵🇾',
    name: 'Paraguay',
    currencySymbol: '₲',
    currencyName: 'Guaraní (PYG)',
    defaultTaxRate: 0.10,
    taxLabel: 'I.V.A (10%)',
    phonePlaceholder: '(0981) 123-456'
  },
  {
    code: '+503',
    dialCode: '503',
    iso: 'SV',
    flag: '🇸🇻',
    name: 'El Salvador',
    currencySymbol: 'USD $',
    currencyName: 'Dólar (USD)',
    defaultTaxRate: 0.13,
    taxLabel: 'I.V.A (13%)',
    phonePlaceholder: '(7123) 4567'
  },
  {
    code: '+504',
    dialCode: '504',
    iso: 'HN',
    flag: '🇭🇳',
    name: 'Honduras',
    currencySymbol: 'L',
    currencyName: 'Lempira (HNL)',
    defaultTaxRate: 0.15,
    taxLabel: 'I.S.V (15%)',
    phonePlaceholder: '(9123) 4567'
  },
  {
    code: '+505',
    dialCode: '505',
    iso: 'NI',
    flag: '🇳🇮',
    name: 'Nicaragua',
    currencySymbol: 'C$',
    currencyName: 'Córdoba (NIO)',
    defaultTaxRate: 0.15,
    taxLabel: 'I.V.A (15%)',
    phonePlaceholder: '(8123) 4567'
  },
  {
    code: '+506',
    dialCode: '506',
    iso: 'CR',
    flag: '🇨🇷',
    name: 'Costa Rica',
    currencySymbol: '₡',
    currencyName: 'Colón (CRC)',
    defaultTaxRate: 0.13,
    taxLabel: 'I.V.A (13%)',
    phonePlaceholder: '(8123) 4567'
  },
  {
    code: '+507',
    dialCode: '507',
    iso: 'PA',
    flag: '🇵🇦',
    name: 'Panamá',
    currencySymbol: 'USD $',
    currencyName: 'Dólar / Balboa (PAB)',
    defaultTaxRate: 0.07,
    taxLabel: 'I.T.B.M.S (7%)',
    phonePlaceholder: '(6123) 4567'
  },
  {
    code: '+1',
    dialCode: '1-DO',
    iso: 'DO',
    flag: '🇩🇴',
    name: 'Rep. Dominicana',
    currencySymbol: 'RD$',
    currencyName: 'Peso Dominicano (DOP)',
    defaultTaxRate: 0.18,
    taxLabel: 'ITBIS (18%)',
    phonePlaceholder: '(809) 123-4567'
  },
  {
    code: '+58',
    dialCode: '58',
    iso: 'VE',
    flag: '🇻🇪',
    name: 'Venezuela',
    currencySymbol: 'Bs',
    currencyName: 'Bolívar (VES)',
    defaultTaxRate: 0.16,
    taxLabel: 'I.V.A (16%)',
    phonePlaceholder: '(412) 123-4567'
  },
  {
    code: '+55',
    dialCode: '55',
    iso: 'BR',
    flag: '🇧🇷',
    name: 'Brasil',
    currencySymbol: 'R$',
    currencyName: 'Real Brasileño (BRL)',
    defaultTaxRate: 0.17,
    taxLabel: 'ICMS (17%)',
    phonePlaceholder: '(11) 91234-5678'
  },
  {
    code: '+1',
    dialCode: '1-CA',
    iso: 'CA',
    flag: '🇨🇦',
    name: 'Canadá',
    currencySymbol: 'CAD $',
    currencyName: 'Dólar Canadiense (CAD)',
    defaultTaxRate: 0.05,
    taxLabel: 'GST (5%)',
    phonePlaceholder: '(416) 123-4567'
  },
  {
    code: '+53',
    dialCode: '53',
    iso: 'CU',
    flag: '🇨🇺',
    name: 'Cuba',
    currencySymbol: '$',
    currencyName: 'Peso Cubano (CUP)',
    defaultTaxRate: 0.10,
    taxLabel: 'Impuesto (10%)',
    phonePlaceholder: '(5) 123-4567'
  },
  {
    code: '+44',
    dialCode: '44',
    iso: 'GB',
    flag: '🇬🇧',
    name: 'Reino Unido',
    currencySymbol: '£',
    currencyName: 'Libra Esterlina (£)',
    defaultTaxRate: 0.20,
    taxLabel: 'VAT (20%)',
    phonePlaceholder: '(7123) 456789'
  },
  {
    code: '+49',
    dialCode: '49',
    iso: 'DE',
    flag: '🇩🇪',
    name: 'Alemania',
    currencySymbol: '€',
    currencyName: 'Euro (€)',
    defaultTaxRate: 0.19,
    taxLabel: 'MwSt (19%)',
    phonePlaceholder: '(151) 1234567'
  },
  {
    code: '+33',
    dialCode: '33',
    iso: 'FR',
    flag: '🇫🇷',
    name: 'Francia',
    currencySymbol: '€',
    currencyName: 'Euro (€)',
    defaultTaxRate: 0.20,
    taxLabel: 'TVA (20%)',
    phonePlaceholder: '(6) 12 34 56 78'
  },
  {
    code: '+39',
    dialCode: '39',
    iso: 'IT',
    flag: '🇮🇹',
    name: 'Italia',
    currencySymbol: '€',
    currencyName: 'Euro (€)',
    defaultTaxRate: 0.22,
    taxLabel: 'IVA (22%)',
    phonePlaceholder: '(312) 345-6789'
  }
];

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
}

export const COMMON_CURRENCIES: CurrencyOption[] = [
  { value: '$', label: 'Peso Mexicano / Argentino / Colombiano / Chileno ($)', symbol: '$' },
  { value: 'USD $', label: 'Dólar Estadounidense (USD $)', symbol: 'USD $' },
  { value: '€', label: 'Euro (€)', symbol: '€' },
  { value: 'S/.', label: 'Sol Peruano (S/.)', symbol: 'S/.' },
  { value: 'Q', label: 'Quetzal Guatemalteco (Q)', symbol: 'Q' },
  { value: 'Bs', label: 'Boliviano / Bolívar (Bs)', symbol: 'Bs' },
  { value: '₡', label: 'Colón Costarricense (₡)', symbol: '₡' },
  { value: 'L', label: 'Lempira Hondureña (L)', symbol: 'L' },
  { value: 'C$', label: 'Córdoba Nicaragüense (C$)', symbol: 'C$' },
  { value: 'RD$', label: 'Peso Dominicano (RD$)', symbol: 'RD$' },
  { value: '₲', label: 'Guaraní Paraguayo (₲)', symbol: '₲' },
  { value: 'R$', label: 'Real Brasileño (R$)', symbol: 'R$' },
  { value: 'CAD $', label: 'Dólar Canadiense (CAD $)', symbol: 'CAD $' },
  { value: '£', label: 'Libra Esterlina (£)', symbol: '£' },
];

/**
 * Busca un país por su código telefónico internacional (ej. '+54', '54', '+52')
 */
export function getCountryByCode(code?: string | null): CountryInfo | undefined {
  if (!code) return undefined;
  const clean = code.trim().replace(/^\+/, '');
  return COUNTRY_LIST.find(c => c.dialCode === clean || c.code.replace('+', '') === clean);
}

/**
 * Busca un país por su nombre (ej. 'Argentina', 'México')
 */
export function getCountryByName(name?: string | null): CountryInfo | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  return COUNTRY_LIST.find(c => c.name.toLowerCase() === n || c.iso.toLowerCase() === n);
}

/**
 * Retorna el nombre formateado con bandera para mostrar en listas o detalles
 */
export function formatCountryDisplayName(codeOrName?: string | null): string {
  if (!codeOrName) return '';
  const country = getCountryByCode(codeOrName) || getCountryByName(codeOrName);
  if (country) {
    return `${country.flag} ${country.name} (${country.code})`;
  }
  return codeOrName.startsWith('+') ? `🌐 ${codeOrName}` : `🌐 +${codeOrName}`;
}
