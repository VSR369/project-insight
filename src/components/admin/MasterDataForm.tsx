import * as React from "react";
import { useForm, FieldValues, DefaultValues, Path, ControllerRenderProps } from "react-hook-form";
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
    } catch {
      // Error handling is done in the parent component
    }
  };

  const renderFieldInput = (
    fieldConfig: FormFieldConfig<TData>,
    field: ControllerRenderProps<TData, Path<TData>>
  ) => {
    const { type, placeholder, disabled, options, min, max } = fieldConfig;

    switch (type) {
      case "text":
        return (
          <Input
            {...field}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            value={(field.value as string) ?? ""}
          />
        );
      case "number":
        return (
          <Input
            {...field}
            type="number"
            placeholder={placeholder}
            disabled={disabled || isLoading}
            min={min}
            max={max}
            value={(field.value as number) ?? ""}
            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
          />
        );
      case "textarea":
        return (
          <Textarea
            {...field}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            value={(field.value as string) ?? ""}
            rows={3}
          />
        );
      case "switch":
        return (
          <Switch
            checked={(field.value as boolean) ?? false}
            onCheckedChange={field.onChange}
            disabled={disabled || isLoading}
          />
        );
      case "select":
        return (
          <Select
            value={(field.value as string) ?? ""}
            onValueChange={field.onChange}
            disabled={disabled || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  const renderField = (fieldConfig: FormFieldConfig<TData>) => {
    const { name, label, type, description } = fieldConfig;

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
              {renderFieldInput(fieldConfig, field)}
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
