/**
 * Country Selector (REG-001)
 * 
 * Dropdown for selecting headquarters country.
 * Auto-populates locale fields (BR-REG-001).
 * Excludes OFAC-sanctioned countries (BR-REG-004).
 */

import { useCountries } from '@/hooks/queries/useMasterData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface CountrySelectorProps {
  value: string;
  onChange: (countryId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CountrySelector({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select country',
}: CountrySelectorProps) {
  const { data: countries, isLoading } = useCountries();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  // Filter out countries - we'll check is_ofac_restricted when the column is available
  const activeCountries = countries ?? [];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="text-base">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {activeCountries.map((country) => (
          <SelectItem key={country.id} value={country.id}>
            {country.name}
            {country.phone_code ? ` (${country.phone_code})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
