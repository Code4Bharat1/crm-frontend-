import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
const Form = FormProvider;
const FormFieldContext = React.createContext(null);
const FormField = ({
  ...props
}) => {
  return /* @__PURE__ */ React.createElement(FormFieldContext.Provider, { value: { name: props.name } }, /* @__PURE__ */ React.createElement(Controller, { ...props }));
};
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }
  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>");
  }
  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState
  };
};
const FormItemContext = React.createContext(null);
const FormItem = React.forwardRef(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    return /* @__PURE__ */ React.createElement(FormItemContext.Provider, { value: { id } }, /* @__PURE__ */ React.createElement("div", { ref, className: cn("space-y-2", className), ...props }));
  }
);
FormItem.displayName = "FormItem";
const FormLabel = React.forwardRef(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();
  return /* @__PURE__ */ React.createElement(
    Label,
    {
      ref,
      className: cn(error && "text-destructive", className),
      htmlFor: formItemId,
      ...props
    }
  );
});
FormLabel.displayName = "FormLabel";
const FormControl = React.forwardRef(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return /* @__PURE__ */ React.createElement(
    Slot,
    {
      ref,
      id: formItemId,
      "aria-describedby": !error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`,
      "aria-invalid": !!error,
      ...props
    }
  );
});
FormControl.displayName = "FormControl";
const FormDescription = React.forwardRef(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();
  return /* @__PURE__ */ React.createElement(
    "p",
    {
      ref,
      id: formDescriptionId,
      className: cn("text-[0.8rem] text-muted-foreground", className),
      ...props
    }
  );
});
FormDescription.displayName = "FormDescription";
const FormMessage = React.forwardRef(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;
  if (!body) {
    return null;
  }
  return /* @__PURE__ */ React.createElement(
    "p",
    {
      ref,
      id: formMessageId,
      className: cn("text-[0.8rem] font-medium text-destructive", className),
      ...props
    },
    body
  );
});
FormMessage.displayName = "FormMessage";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField
};
