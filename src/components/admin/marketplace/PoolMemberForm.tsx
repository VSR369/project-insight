/**
 * PoolMemberForm — Add/Edit Pool Member side-sheet form (SCR-02)
 * BRD Ref: BR-PP-004 (mandatory fields), BR-PP-005 (audit)
 * Role codes fetched from md_slm_role_codes master data.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Lock, X } from "lucide-react";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useProficiencyAreasLookup } from "@/hooks/queries/useProficiencyAreasLookup";
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
import { useEffect } from "react";

interface PoolMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMember?: PoolMemberRow | null;
}

export function PoolMemberForm({ open, onOpenChange, editMember }: PoolMemberFormProps) {
  const isEdit = !!editMember;
  const { data: industries } = useIndustrySegments();
  const { data: proficiencies } = useProficiencyAreasLookup();
  const { data: roleCodes } = useSlmRoleCodes();
  const createMutation = useCreatePoolMember();
  const updateMutation = useUpdatePoolMember();

  const form = useForm<PoolMemberFormValues>({
    resolver: zodResolver(poolMemberSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      role_codes: [],
      industry_ids: [],
      proficiency_id: "",
      max_concurrent: 1,
    },
  });

  // Populate form for edit mode
  useEffect(() => {
    if (editMember) {
      form.reset({
        full_name: editMember.full_name,
        email: editMember.email,
        phone: editMember.phone ?? "",
        role_codes: editMember.role_codes,
        industry_ids: editMember.industry_ids,
        proficiency_id: editMember.proficiency_id ?? "",
        max_concurrent: editMember.max_concurrent,
      });
    } else {
      form.reset({
        full_name: "",
        email: "",
        phone: "",
        role_codes: [],
        industry_ids: [],
        proficiency_id: "",
        max_concurrent: 1,
      });
    }
  }, [editMember, form]);

  const onSubmit = async (data: PoolMemberFormValues) => {
    if (isEdit && editMember) {
      await updateMutation.mutateAsync({
        id: editMember.id,
        full_name: data.full_name,
        phone: data.phone || undefined,
        role_codes: data.role_codes,
        industry_ids: data.industry_ids,
        proficiency_id: data.proficiency_id,
        max_concurrent: data.max_concurrent,
      });
    } else {
      await createMutation.mutateAsync({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || undefined,
        role_codes: data.role_codes,
        industry_ids: data.industry_ids,
        proficiency_id: data.proficiency_id,
        max_concurrent: data.max_concurrent,
      });
    }
    onOpenChange(false);
  };

  const selectedIndustries = form.watch("industry_ids");
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

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 98765 43210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Industry Segments — multi-select chips */}
            <FormField
              control={form.control}
              name="industry_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry Segment(s) <span className="text-destructive">*</span></FormLabel>
                  <Select
                    onValueChange={(value) => {
                      if (!field.value?.includes(value)) {
                        field.onChange([...(field.value ?? []), value]);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry segments" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {industries
                        ?.filter((ind) => !selectedIndustries?.includes(ind.id))
                        .map((ind) => (
                          <SelectItem key={ind.id} value={ind.id}>
                            {ind.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedIndustries && selectedIndustries.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedIndustries.map((id) => {
                        const ind = industries?.find((i) => i.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="gap-1">
                            {ind?.name ?? id}
                            <button
                              type="button"
                              onClick={() =>
                                field.onChange(field.value?.filter((v) => v !== id))
                              }
                              className="ml-0.5 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Proficiency Level */}
            <FormField
              control={form.control}
              name="proficiency_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proficiency Level <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select proficiency level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {proficiencies?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
