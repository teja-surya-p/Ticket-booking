'use client';

import { useMemo } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import "./field.module.css";
function FieldSet({
  className,
  ...props
}) {
  return <fieldset data-slot="field-set" className={cn("field-class-1", "field-class-2", className)} {...props} />;
}
function FieldLegend({
  className,
  variant = 'legend',
  ...props
}) {
  return <legend data-slot="field-legend" data-variant={variant} className={cn("field-class-3", "field-class-4", "field-class-5", className)} {...props} />;
}
function FieldGroup({
  className,
  ...props
}) {
  return <div data-slot="field-group" className={cn("field-class-6", className)} {...props} />;
}
const fieldVariants = cva('group/field flex w-full gap-3 data-[invalid=true]:text-destructive', {
  variants: {
    orientation: {
      vertical: ['flex-col [&>*]:w-full [&>.sr-only]:w-auto'],
      horizontal: ['flex-row items-center', '[&>[data-slot=field-label]]:flex-auto', 'has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px'],
      responsive: ['flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto', '@md/field-group:[&>[data-slot=field-label]]:flex-auto', '@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px']
    }
  },
  defaultVariants: {
    orientation: 'vertical'
  }
});
function Field({
  className,
  orientation = 'vertical',
  ...props
}) {
  return <div role="group" data-slot="field" data-orientation={orientation} className={cn(fieldVariants({
    orientation
  }), className)} {...props} />;
}
function FieldContent({
  className,
  ...props
}) {
  return <div data-slot="field-content" className={cn("field-class-7", className)} {...props} />;
}
function FieldLabel({
  className,
  ...props
}) {
  return <Label data-slot="field-label" className={cn("field-class-8", "field-class-9", "field-class-10", className)} {...props} />;
}
function FieldTitle({
  className,
  ...props
}) {
  return <div data-slot="field-label" className={cn("field-class-11", className)} {...props} />;
}
function FieldDescription({
  className,
  ...props
}) {
  return <p data-slot="field-description" className={cn("field-class-12", "field-class-13", "field-class-14", className)} {...props} />;
}
function FieldSeparator({
  children,
  className,
  ...props
}) {
  return <div data-slot="field-separator" data-content={!!children} className={cn("field-class-15", className)} {...props}>
      <Separator className={"field-class-16"} />
      {children && <span className={"field-class-17"} data-slot="field-separator-content">
          {children}
        </span>}
    </div>;
}
function FieldError({
  className,
  children,
  errors,
  ...props
}) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }
    if (!errors) {
      return null;
    }
    if (errors.length === 1 && errors[0]?.message) {
      return errors[0].message;
    }
    return <ul className={"field-class-18"}>
        {errors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
      </ul>;
  }, [children, errors]);
  if (!content) {
    return null;
  }
  return <div role="alert" data-slot="field-error" className={cn("field-class-19", className)} {...props}>
      {content}
    </div>;
}
export { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSeparator, FieldSet, FieldContent, FieldTitle };
