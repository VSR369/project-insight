/**
 * PhoneInputSplit — Reusable split phone input: Country Code dropdown + Phone Number input.
 * Stores combined string in DB, parses/formats for UI display.
 * Country codes sourced from `countries` master data table.
 */

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCountries } from "@/hooks/queries/useCountries";

// ── Helpers ──────────────────────────────────────────────

/** Parse a stored phone string like "+1 1234567890" into parts */
export function parsePhoneIntl(combined: string | null | undefined): {
  countryCode: string;
  phoneNumber: string;
} {
  if (!combined || !combined.trim()) {
    return { countryCode: "", phoneNumber: "" };
  }
  const trimmed = combined.trim();
  // Match leading +digits as country code, rest as phone number
  const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    return { countryCode: match[1], phoneNumber: match[2] };
  }
  // If no match, treat entire string as phone number
  return { countryCode: "", phoneNumber: trimmed };
}

/** Combine country code + phone number into a single stored string */
export function formatPhoneIntl(countryCode: string, phoneNumber: string): string {
  const code = countryCode.trim();
  const number = phoneNumber.trim();
  if (!code && !number) return "";
  if (!code) return number;
  if (!number) return code;
  return `${code} ${number}`;
}

// ── Component ────────────────────────────────────────────

interface PhoneInputSplitProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (number: string) => void;
  disabled?: boolean;
  /** Placeholder for the phone number input */
  phonePlaceholder?: string;
}

export function PhoneInputSplit({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  disabled = false,
  phonePlaceholder = "Phone number",
}: PhoneInputSplitProps) {
  const { data: countries = [] } = useCountries();

  // Build unique country code options from master data
  const codeOptions = useMemo(() => {
    const seen = new Set<string>();
    return countries
      .filter((c) => c.phone_code && c.phone_code.trim())
      .filter((c) => {
        const key = c.phone_code!;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((c) => ({
        value: c.phone_code!,
        label: c.phone_code_display || `${c.phone_code} (${c.code})`,
      }));
  }, [countries]);

  return (
    <div className="flex gap-2">
      <Select
        value={countryCode}
        onValueChange={onCountryCodeChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[140px] shrink-0">
          <SelectValue placeholder="Code" />
        </SelectTrigger>
        <SelectContent>
          {codeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={(e) => onPhoneNumberChange(e.target.value)}
        placeholder={phonePlaceholder}
        disabled={disabled}
        className="flex-1"
      />
    </div>
  );
}
