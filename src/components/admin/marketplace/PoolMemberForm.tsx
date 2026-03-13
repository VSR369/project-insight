/**
 * PoolMemberForm — Add/Edit Pool Member side-sheet form (SCR-02)
 * BRD Ref: BR-PP-004 (mandatory fields), BR-PP-005 (audit)
 * Role codes fetched from md_slm_role_codes master data.
 * Domain scope uses cascading ScopeMultiSelect (Industry → Proficiency → Sub-domain → Speciality).
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock } from "lucide-react";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import {
  useCreatePoolMember,
  useUpdatePoolMember,
  type PoolMemberRow,
} from "@/hooks/queries/usePoolMembers";
import {
  poolMemberSchema,
  type PoolMemberFormValues,
} from "@/lib/validations/poolMember";
import { EMPTY_SCOPE } from "@/hooks/queries/useDelegatedAdmins";
import { ScopeMultiSelect } from "@/components/org/ScopeMultiSelect";
import { PhoneInputSplit, parsePhoneIntl, formatPhoneIntl } from "@/components/ui/PhoneInputSplit";
import { useEffect } from "react";

interface PoolMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMember?: PoolMemberRow | null;
}

export function PoolMemberForm({ open, onOpenChange, editMember }: PoolMemberFormProps) {
  const isEdit = !!editMember;
  const { data: allRoleCodes } = useSlmRoleCodes();
  const roleCodes = allRoleCodes?.filter((r) => r.model_applicability !== "agg");
  const createMutation = useCreatePoolMember();
  const updateMutation = useUpdatePoolMember();

  const form = useForm<PoolMemberFormValues>({
    resolver: zodResolver(poolMemberSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_country_code: "",
      phone_number: "",
      role_codes: [],
      domain_scope: { ...EMPTY_SCOPE },
      max_concurrent: 1,
    },
  });

  // Populate form for edit mode
  useEffect(() => {
    if (editMember) {
      const parsed = parsePhoneIntl(editMember.phone);
      form.reset({
        full_name: editMember.full_name,
        email: editMember.email,
        phone_country_code: parsed.countryCode,
        phone_number: parsed.phoneNumber,
        role_codes: editMember.role_codes,
        domain_scope: editMember.domain_scope ?? { ...EMPTY_SCOPE },
        max_concurrent: editMember.max_concurrent,
      });
    } else {
      form.reset({
        full_name: "",
        email: "",
        phone_country_code: "",
        phone_number: "",
        role_codes: [],
        domain_scope: { ...EMPTY_SCOPE },
        max_concurrent: 1,
      });
    }
  }, [editMember, form]);

  const onSubmit = async (data: PoolMemberFormValues) => {
    const combined = formatPhoneIntl(data.phone_country_code || "", data.phone_number || "");
    if (isEdit && editMember) {
      await updateMutation.mutateAsync({
        id: editMember.id,
        full_name: data.full_name,
        phone: combined || undefined,
        role_codes: data.role_codes,
        domain_scope: data.domain_scope,
        max_concurrent: data.max_concurrent,
      });
    } else {
      await createMutation.mutateAsync({
        full_name: data.full_name,
        email: data.email,
        phone: combined || undefined,
        role_codes: data.role_codes,
        domain_scope: data.domain_scope,
        max_concurrent: data.max_concurrent,
      });
    }
    onOpenChange(false);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Pool Member" : "Add Pool Member"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update pool member details." : "Add a new member to the SLM resource pool."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        disabled={isEdit}
                        {...field}
                      />
                      {isEdit && (
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone — split into Country Code + Number */}
            <div>
              <FormLabel>Phone</FormLabel>
              <div className="mt-1.5">
                <PhoneInputSplit
                  countryCode={form.watch("phone_country_code") || ""}
                  phoneNumber={form.watch("phone_number") || ""}
                  onCountryCodeChange={(v) => form.setValue("phone_country_code", v, { shouldDirty: true })}
                  onPhoneNumberChange={(v) => form.setValue("phone_number", v, { shouldDirty: true })}
                />
              </div>
            </div>

            {/* Roles — checkbox group from master data */}
            <FormField
              control={form.control}
              name="role_codes"
              render={() => (
                <FormItem>
                  <FormLabel>Role(s) <span className="text-destructive">*</span></FormLabel>
                  <div className="space-y-2">
                    {roleCodes?.map((role) => (
                      <FormField
                        key={role.code}
                        control={form.control}
                        name="role_codes"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(role.code)}
                                onCheckedChange={(checked) => {
                                  const updated = checked
                                    ? [...(field.value ?? []), role.code]
                                    : (field.value ?? []).filter((v) => v !== role.code);
                                  field.onChange(updated);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {role.display_name}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Domain Scope — cascading Industry → Proficiency → Sub-domain → Speciality */}
            <FormField
              control={form.control}
              name="domain_scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain Scope <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <ScopeMultiSelect
                      value={field.value}
                      onChange={field.onChange}
                      hideDepartments
                      allowAll
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Concurrent */}
            <FormField
              control={form.control}
              name="max_concurrent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Concurrent Challenges</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={20} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEdit ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
