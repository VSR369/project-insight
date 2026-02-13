/**
 * CreateChildOrgDialog — Lightweight popup for creating a child organization
 * with duplicate detection via trigram similarity check (BR-REG-007).
 *
 * Standards: Section 7.3 (dialog), 8.1 (Zod+RHF), 23 (hook order)
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCountries } from "@/hooks/queries/useMasterData";
import { useStatesForCountry } from "@/hooks/queries/useRegistrationData";
import { useCheckDuplicateOrg } from "@/hooks/queries/useSaasData";
import {
  childOrgSchema,
  type ChildOrgFormValues,
} from "@/pages/admin/saas/saasAgreement.schema";
import { DuplicateOrgModal } from "@/components/registration/DuplicateOrgModal";

interface CreateChildOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  onSubmit: (data: ChildOrgFormValues) => Promise<void>;
}

export function CreateChildOrgDialog({
  open,
  onOpenChange,
  isLoading,
  onSubmit,
}: CreateChildOrgDialogProps) {
  // ── useState ──
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateOrgName, setDuplicateOrgName] = useState<string | undefined>();
  const [pendingData, setPendingData] = useState<ChildOrgFormValues | null>(null);

  // ── Form hook ──
  const form = useForm<ChildOrgFormValues>({
    resolver: zodResolver(childOrgSchema),
    defaultValues: {
      organization_name: "",
      legal_entity_name: null,
      hq_country_id: "",
      hq_state_province_id: null,
      hq_city: null,
      hq_postal_code: null,
      hq_address_line1: null,
    },
  });

  const selectedCountryId = form.watch("hq_country_id");

  // ── Query / Mutation hooks ──
  const { data: countries = [] } = useCountries();
  const { data: states = [] } = useStatesForCountry(selectedCountryId ?? undefined);
  const checkDuplicate = useCheckDuplicateOrg();

  // ── Handlers ──
  const handleFormSubmit = async (data: ChildOrgFormValues) => {
    // Run duplicate check first
    try {
      const matches = await checkDuplicate.mutateAsync({
        orgName: data.organization_name,
        countryId: data.hq_country_id,
      });

      if (matches.length > 0) {
        // Show warning with closest match
        setDuplicateOrgName(matches[0].organization_name);
        setPendingData(data);
        setShowDuplicateWarning(true);
        return;
      }
    } catch {
      // If duplicate check fails, proceed anyway (non-blocking)
    }

    await submitOrg(data);
  };

  const submitOrg = async (data: ChildOrgFormValues) => {
    await onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  const handleProceedAnyway = async () => {
    setShowDuplicateWarning(false);
    if (pendingData) {
      await submitOrg(pendingData);
      setPendingData(null);
    }
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateWarning(false);
    setPendingData(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Add Child Organization</DialogTitle>
            <DialogDescription>
              Create a new child organization with basic details
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4 px-1"
            >
              <FormField
                control={form.control}
                name="organization_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. ACME Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legal_entity_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Entity Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Legal name (if different)"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hq_country_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          form.setValue("hq_state_province_id", null);
                        }}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hq_state_province_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Province</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={!selectedCountryId || states.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {states.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hq_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hq_postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ZIP / Postal code"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hq_address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Street address"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="shrink-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || checkDuplicate.isPending}>
                  {checkDuplicate.isPending ? "Checking..." : isLoading ? "Creating..." : "Create Organization"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DuplicateOrgModal
        open={showDuplicateWarning}
        onOpenChange={setShowDuplicateWarning}
        existingOrgName={duplicateOrgName}
        onProceed={handleProceedAnyway}
        onCancel={handleCancelDuplicate}
      />
    </>
  );
}
