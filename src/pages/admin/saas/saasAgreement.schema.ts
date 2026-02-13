/**
 * Zod validation schema for SaaS Agreement create/edit form.
 * Standards: Section 8.1 (mandatory Zod + RHF)
 */

import { z } from "zod";

export const AGREEMENT_TYPES = [
  { value: "saas_fee", label: "SaaS Fee" },
  { value: "shadow_billing", label: "Shadow Billing" },
  { value: "cost_sharing", label: "Cost Sharing" },
] as const;

export const FEE_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
] as const;

export const saasAgreementSchema = z
  .object({
    child_organization_id: z
      .string()
      .min(1, "Child organization is required")
      .uuid("Invalid organization selection"),
    agreement_type: z.enum(["saas_fee", "shadow_billing", "cost_sharing"], {
      errorMap: () => ({ message: "Please select an agreement type" }),
    }),
    fee_amount: z.coerce
      .number({ invalid_type_error: "Fee amount must be a number" })
      .min(0, "Fee amount cannot be negative"),
    fee_currency: z
      .string()
      .length(3, "Currency must be exactly 3 characters")
      .toUpperCase(),
    fee_frequency: z.enum(["monthly", "quarterly", "annually"], {
      errorMap: () => ({ message: "Please select a fee frequency" }),
    }),
    shadow_charge_rate: z.coerce
      .number()
      .min(0, "Rate cannot be negative")
      .max(100, "Rate cannot exceed 100%")
      .optional()
      .nullable(),
    starts_at: z.string().optional().nullable(),
    ends_at: z.string().optional().nullable(),
    auto_renew: z.boolean().default(true),
    notes: z
      .string()
      .max(500, "Notes must be 500 characters or less")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.starts_at && data.ends_at) {
        return new Date(data.ends_at) > new Date(data.starts_at);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["ends_at"],
    }
  );

export type SaasAgreementFormValues = z.infer<typeof saasAgreementSchema>;

/** Default values for create mode */
export const SAAS_AGREEMENT_DEFAULTS: SaasAgreementFormValues = {
  child_organization_id: "",
  agreement_type: "saas_fee",
  fee_amount: 0,
  fee_currency: "USD",
  fee_frequency: "monthly",
  shadow_charge_rate: null,
  starts_at: null,
  ends_at: null,
  auto_renew: true,
  notes: null,
};
