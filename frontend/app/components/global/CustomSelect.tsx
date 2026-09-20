import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface SelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  loading?: boolean;
}

/** Same look as CustomInput so mixed forms line up. */
export function CustomSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Select...",
  options,
  disabled,
  loading = false,
}: CustomSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="space-y-1.5">
          <FieldLabel
            htmlFor={name}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1"
          >
            {label}
          </FieldLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value || undefined}
            disabled={disabled || loading}
          >
            <SelectTrigger
              id={name}
              className={cn(
                "w-full h-12! rounded-2xl px-4 text-sm shadow-sm",
                fieldState.invalid &&
                  "border-red-300 focus:border-red-500 dark:border-red-900",
              )}
            >
              <SelectValue placeholder={loading ? "Loading..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
