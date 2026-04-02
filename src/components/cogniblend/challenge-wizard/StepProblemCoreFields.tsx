/**
 * StepProblem — Core Fields (Title, Hook, Description, Industry, Experience Countries)
 * Extracted from StepProblem.tsx for decomposition.
 */

import { useState } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Search, X, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AiFieldAssist } from './AiFieldAssist';
import type { ChallengeFormValues } from './challengeFormSchema';

const TITLE_MAX = 200;

interface StepProblemCoreFieldsProps {
  form: UseFormReturn<ChallengeFormValues>;
  isQuick: boolean;
  industrySegments: Array<{ id: string; name: string }>;
  loadingSegments: boolean;
  countriesList: Array<{ id: string; name: string; code: string }>;
  loadingCountries: boolean;
}

export function StepProblemCoreFields({
  form, isQuick, industrySegments, loadingSegments, countriesList, loadingCountries,
}: StepProblemCoreFieldsProps) {
  const { register, formState: { errors }, watch, control, setValue } = form;
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const titleValue = watch('title') ?? '';
  const titleLen = titleValue.length;
  const countries = watch('experience_countries') ?? [];

  const aiContext = {
    title: titleValue,
    problem_statement: watch('problem_statement') ?? '',
    maturity_level: watch('maturity_level') ?? '',
    governance_mode: watch('governance_mode') ?? '',
  };

  const filteredCountries = countriesList.filter(
    (c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) && !countries.includes(c.id),
  );

  const addCountry = (countryId: string) => {
    if (!countries.includes(countryId)) {
      setValue('experience_countries', [...countries, countryId]);
    }
    setCountrySearch('');
    setShowCountryDropdown(false);
  };

  const removeCountry = (countryId: string) => {
    setValue('experience_countries', countries.filter((x: string) => x !== countryId));
  };

  const getCountryName = (id: string) => countriesList.find((c) => c.id === id)?.name ?? id;

  return (
    <>
      {/* ── 1. Title ── */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-sm font-medium">
          Challenge Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          maxLength={TITLE_MAX + 20}
          placeholder="Give your challenge a clear, descriptive title"
          className={cn('text-base', errors.title && 'border-destructive focus-visible:ring-destructive')}
          {...register('title')}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            ) : titleLen > 0 && titleLen <= TITLE_MAX ? (
              <span className="flex items-center gap-1 text-xs text-[hsl(155,68%,37%)]">
                <CheckCircle className="h-3 w-3" /> Valid
              </span>
            ) : (
              <span />
            )}
          </div>
          <span className={cn('text-xs tabular-nums', titleLen > TITLE_MAX ? 'text-destructive font-medium' : 'text-muted-foreground')}>
            {titleLen} / {TITLE_MAX}
          </span>
        </div>
      </div>

      {/* ── 1b. The Hook ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="hook" className="text-sm font-medium">
            The Hook <span className="text-destructive">*</span>
          </Label>
          <AiFieldAssist fieldName="hook" context={aiContext} onResult={(content) => setValue('hook', content)} compact />
        </div>
        <Input
          id="hook"
          maxLength={300}
          placeholder="A compelling one-liner that captures the essence of this challenge"
          className="text-base"
          {...register('hook')}
        />
        <p className="text-xs text-muted-foreground">Short tagline to attract solvers (max 300 chars)</p>
      </div>

      {/* ── 1c. Challenge Description ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className="text-sm font-medium">
            Challenge Description <span className="text-destructive">*</span>
          </Label>
          <AiFieldAssist fieldName="description" context={aiContext} onResult={(content) => setValue('description', content)} compact />
        </div>
        <Input
          id="description"
          placeholder="Provide a short summary description of the challenge"
          className="text-base"
          {...register('description')}
        />
      </div>

      {/* ── 2. Industry Segment ── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Industry Segment{' '}
          {!isQuick
            ? <span className="text-destructive">*</span>
            : <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
        </Label>
        <Controller
          name="industry_segment_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder={loadingSegments ? 'Loading…' : 'Select industry segment'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {industrySegments.map((seg) => (
                  <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* ── 3. Experience Countries ── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Experience Countries <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        {countries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {countries.map((id: string) => (
              <Badge key={id} variant="outline" className="gap-1 pr-1 border bg-secondary text-secondary-foreground">
                {getCountryName(id)}
                <button type="button" onClick={() => removeCountry(id)} className="ml-0.5 rounded-full hover:bg-black/10 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={countrySearch}
            onChange={(e) => { setCountrySearch(e.target.value); setShowCountryDropdown(true); }}
            onFocus={() => setShowCountryDropdown(true)}
            onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
            placeholder={loadingCountries ? 'Loading countries…' : 'Search countries…'}
            className="pl-9"
          />
          {showCountryDropdown && filteredCountries.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredCountries.slice(0, 20).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                  onClick={() => addCountry(c.id)}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
