import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

const baseRegisterSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
  confirmPassword: z.string(),
  address: z.string().optional(),
  pinCode: z.string().optional(),
  countryId: z.string().optional(),
});

export const registerSchema = baseRegisterSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

const baseStudentSchema = baseRegisterSchema.extend({
  institution: z.string().min(2, 'Institution name is required'),
  graduationYear: z.number().min(2020, 'Invalid graduation year').max(2035, 'Invalid graduation year'),
  disciplineId: z.string().min(1, 'Please select a discipline'),
  streamId: z.string().optional(),
  subjectId: z.string().optional(),
});

export const studentRegisterSchema = baseStudentSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

// Reviewer registration schema - for self-signup
const baseReviewerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
  confirmPassword: z.string(),
  phone: z.string().optional(),
  industrySegmentIds: z.array(z.string()).min(1, 'Select at least one industry segment'),
  expertiseLevelIds: z.array(z.string()).min(1, 'Select at least one expertise level'),
  yearsExperience: z.number().min(0).max(50).optional(),
  timezone: z.string().optional(),
  whyJoinStatement: z
    .string()
    .min(50, 'Please provide at least 50 characters explaining why you want to be a reviewer')
    .max(500, 'Statement must be 500 characters or less'),
});

export const reviewerRegisterSchema = baseReviewerSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

// Admin registration schema - requires access code
const baseAdminSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
  confirmPassword: z.string(),
  accessCode: z.string().min(1, 'Access code is required'),
});

export const adminRegisterSchema = baseAdminSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type StudentRegisterFormData = z.infer<typeof studentRegisterSchema>;
export type ReviewerRegisterFormData = z.infer<typeof reviewerRegisterSchema>;
export type AdminRegisterFormData = z.infer<typeof adminRegisterSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
