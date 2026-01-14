import * as React from "react";
import { useForm, FieldValues, DefaultValues, Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FieldType = "text" | "number" | "textarea" | "switch" | "select";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormFieldConfig<TData = unknown> {
  name: keyof TData | string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  min?: number;
  max?: number;
  defaultValue?: unknown;
}

interface MasterDataFormProps<TData extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormFieldConfig<TData>[];
  schema: z.ZodType<TData>;
  defaultValues?: Partial<TData>;
  onSubmit: (data: TData) => Promise<void>;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

export function MasterDataForm<TData extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  schema,
  defaultValues,
  onSubmit,
  isLoading = false,
  mode = "create",
}: MasterDataFormProps<TData>) {
  const form = useForm<TData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<TData>,
  });

  // Reset form when defaultValues change (switching between create/edit)
  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues as DefaultValues<TData>);
    }
  }, [open, defaultValues, form]);

  const handleSubmit = async (data: TData) => {
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Form submission error:", error);
    }
  };

  const renderField = (fieldConfig: FormFieldConfig<TData>) => {
    const { name, label, type, placeholder, description, disabled, options, min, max } = fieldConfig;

    return (
      <FormField
        key={String(name)}
        control={form.control}
        name={name as Path<TData>}
        render={({ field }) => (
          <FormItem className={type === "switch" ? "flex flex-row items-center justify-between rounded-lg border p-4" : ""}>
            <div className={type === "switch" ? "space-y-0.5" : ""}>
              <FormLabel>{label}</FormLabel>
              {description && <FormDescription>{description}</FormDescription>}
            </div>
            <FormControl>
              {type === "text" && (
                <Input
                  {...field}
                  placeholder={placeholder}
                  disabled={disabled || isLoading}
                  value={field.value ?? ""}
                />
              )}
              {type === "number" && (
                <Input
                  {...field}
                  type="number"
                  placeholder={placeholder}
                  disabled={disabled || isLoading}
                  min={min}
                  max={max}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                />
              )}
              {type === "textarea" && (
                <Textarea
                  {...field}
                  placeholder={placeholder}
                  disabled={disabled || isLoading}
                  value={field.value ?? ""}
                  rows={3}
                />
              )}
              {type === "switch" && (
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  disabled={disabled || isLoading}
                />
              )}
              {type === "select" && options && (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={disabled || isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormControl>
            {type !== "switch" && <FormMessage />}
          </FormItem>
        )}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? `Add ${title}` : `Edit ${title}`}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {fields.map(renderField)}
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
