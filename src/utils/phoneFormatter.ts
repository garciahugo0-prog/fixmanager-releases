/**
 * Formats a raw string or number into the required phone format: (XXX) XXX-XXXX
 * If the input doesn't have enough digits or has others, it cleans and displays it properly.
 */
export function formatPhoneNumber(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  let digits = str.replace(/\D/g, '');
  if (!digits) return '';

  // Handle international prefix codes (Mexico 52/521, USA 1, etc.)
  if (digits.length === 12 && digits.startsWith('52')) {
    digits = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith('521')) {
    digits = digits.slice(3);
  } else if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  } else if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  // Limit to exactly 10 digits
  const capped = digits.slice(0, 10);

  if (capped.length <= 3) {
    return `(${capped}`;
  } else if (capped.length <= 6) {
    return `(${capped.slice(0, 3)}) ${capped.slice(3)}`;
  } else {
    return `(${capped.slice(0, 3)}) ${capped.slice(3, 6)}-${capped.slice(6)}`;
  }
}

/**
 * Formats a number or string into a localized currency string: 1,234.56
 */
export function formatPrice(num: number | string | undefined | null): string {
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
