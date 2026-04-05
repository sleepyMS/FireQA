"use client";

import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/* ------------------------------------------------------------------ */
/*  Form — FormProvider wrapper                                        */
/* ------------------------------------------------------------------ */
const Form = FormProvider;

/* ------------------------------------------------------------------ */
/*  FormField context                                                  */
/* ------------------------------------------------------------------ */
interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  useFormField — shared hook for reading field state                  */
/* ------------------------------------------------------------------ */
interface FormItemContextValue {
  id: string;
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

/* ------------------------------------------------------------------ */
/*  FormItem — wrapper div with gap                                    */
/* ------------------------------------------------------------------ */
function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("space-y-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  FormLabel — Label with error styling                               */
/* ------------------------------------------------------------------ */
function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  FormControl — passes aria attributes to child via cloneElement     */
/* ------------------------------------------------------------------ */
function FormControl({ children, ...props }: React.ComponentProps<"div">) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  // If a single React element child, clone it with aria props
  if (React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<Record<string, unknown>>,
      {
        id: formItemId,
        "aria-describedby": error
          ? `${formDescriptionId} ${formMessageId}`
          : formDescriptionId,
        "aria-invalid": !!error,
        ...props,
      },
    );
  }

  // Fallback: wrap in a div
  return <div {...props}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  FormDescription — helper text below field                          */
/* ------------------------------------------------------------------ */
function FormDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  FormMessage — error message display                                */
/* ------------------------------------------------------------------ */
function FormMessage({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message) : children;

  if (!body) return null;

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-xs text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
