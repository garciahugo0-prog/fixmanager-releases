/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * FixManager — Selector universal de países y códigos de teléfono con banderas
 */

import React from 'react';
import { COUNTRY_LIST } from '../utils/countries';

interface CountryCodeSelectProps {
  value?: string;
  onChange: (code: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  isCompact?: boolean;
  includeName?: boolean;
  style?: React.CSSProperties;
}

export default function CountryCodeSelect({
  value = '+52',
  onChange,
  className = '',
  id,
  disabled = false,
  isCompact = false,
  includeName = false,
  style
}: CountryCodeSelectProps) {
  // Asegurar formato con prefijo '+'
  const normalizedValue = value ? (value.startsWith('+') ? value : `+${value}`) : '+52';

  // Si el valor no está en la lista estándar, permitir renderizarlo
  const isKnown = COUNTRY_LIST.some(c => c.code === normalizedValue);

  return (
    <select
      id={id}
      value={normalizedValue}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={style}
    >
      {!isKnown && (
        <option value={normalizedValue}>
          🌐 {normalizedValue}
        </option>
      )}
      {COUNTRY_LIST.map((c, idx) => (
        <option key={`${c.code}-${c.iso}-${idx}`} value={c.code}>
          {isCompact
            ? `${c.flag} ${c.code}`
            : includeName
              ? `${c.flag} ${c.code} · ${c.name}`
              : `${c.flag} ${c.code}`}
        </option>
      ))}
    </select>
  );
}
