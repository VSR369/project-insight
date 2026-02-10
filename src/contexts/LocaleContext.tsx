/**
 * LocaleContext (BR-CTY-001)
 * 
 * Global formatting provider for currency, dates, and numbers
 * based on the organization's headquarters country settings.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { format as dateFnsFormat } from 'date-fns';

interface LocaleSettings {
  currencyCode: string;
  currencySymbol: string;
  dateFormat: string;
  numberFormat: string;
}

interface LocaleContextValue extends LocaleSettings {
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date | null | undefined) => string;
  formatNumber: (value: number) => string;
}

const DEFAULT_LOCALE: LocaleSettings = {
  currencyCode: 'USD',
  currencySymbol: '$',
  dateFormat: 'MM/dd/yyyy',
  numberFormat: '1,234.56',
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Derive decimal/grouping separators from the number format string.
 * e.g. "1,234.56" → grouping=",", decimal="."
 * e.g. "1.234,56" → grouping=".", decimal=","
 */
function parseSeparators(numberFormat: string): { grouping: string; decimal: string } {
  // Find last non-digit character — that's the decimal separator
  const lastNonDigit = numberFormat.replace(/\d/g, '');
  if (lastNonDigit.length >= 2) {
    return { grouping: lastNonDigit[0], decimal: lastNonDigit[lastNonDigit.length - 1] };
  }
  return { grouping: ',', decimal: '.' };
}

interface LocaleProviderProps {
  children: ReactNode;
  currencyCode?: string;
  currencySymbol?: string;
  dateFormat?: string;
  numberFormat?: string;
}

export function LocaleProvider({
  children,
  currencyCode = DEFAULT_LOCALE.currencyCode,
  currencySymbol = DEFAULT_LOCALE.currencySymbol,
  dateFormat = DEFAULT_LOCALE.dateFormat,
  numberFormat = DEFAULT_LOCALE.numberFormat,
}: LocaleProviderProps) {
  const value = useMemo<LocaleContextValue>(() => {
    const { grouping, decimal } = parseSeparators(numberFormat);

    const formatNumber = (num: number): string => {
      const [intPart, decPart] = Math.abs(num).toFixed(2).split('.');
      const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, grouping);
      const sign = num < 0 ? '-' : '';
      return `${sign}${grouped}${decimal}${decPart}`;
    };

    const formatCurrency = (amount: number): string => {
      return `${currencySymbol}${formatNumber(amount)} ${currencyCode}`;
    };

    // Convert spec date format to date-fns tokens
    const dateFnsPattern = dateFormat
      .replace('DD', 'dd')
      .replace('YYYY', 'yyyy');

    const formatDate = (date: string | Date | null | undefined): string => {
      if (!date) return '—';
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return dateFnsFormat(d, dateFnsPattern);
      } catch {
        return String(date);
      }
    };

    return {
      currencyCode,
      currencySymbol,
      dateFormat,
      numberFormat,
      formatCurrency,
      formatDate,
      formatNumber,
    };
  }, [currencyCode, currencySymbol, dateFormat, numberFormat]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Hook: useLocale
 * Returns the current locale formatting utilities.
 * Falls back to USD/US defaults if no provider is found.
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;

  // Fallback — safe to use outside provider
  return {
    ...DEFAULT_LOCALE,
    formatCurrency: (amount) => `$${amount.toFixed(2)} USD`,
    formatDate: (date) => {
      if (!date) return '—';
      try {
        return dateFnsFormat(typeof date === 'string' ? new Date(date) : date, 'MM/dd/yyyy');
      } catch {
        return String(date);
      }
    },
    formatNumber: (num) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  };
}
