"use client";

import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

interface UseFormActionOptions<TValues extends FieldValues> {
  schema: z.ZodType<TValues, TValues>;
  action: (data: TValues) => Promise<Response>;
  defaultValues?: DefaultValues<TValues>;
  onSuccess?: (data: any) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useFormAction<TValues extends FieldValues>({
  schema,
  action,
  defaultValues,
  onSuccess,
  successMessage,
  errorMessage = "네트워크 오류가 발생했습니다.",
}: UseFormActionOptions<TValues>) {
  const form = useForm<TValues>({
    resolver: zodResolver(schema) as Resolver<TValues>,
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (data: TValues) => {
    try {
      const res = await action(data);
      const body = await res.json();

      if (res.ok) {
        if (successMessage) toast.success(successMessage);
        onSuccess?.(body);
      } else {
        toast.error(body.error || errorMessage);
      }
    } catch {
      toast.error(errorMessage);
    }
  });

  return {
    form,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
  };
}
