'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import "./select.module.css";
function Select({
  ...props
}) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}
function SelectGroup({
  ...props
}) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}
function SelectValue({
  ...props
}) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}
function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}) {
  return <SelectPrimitive.Trigger data-slot="select-trigger" data-size={size} className={cn("select-class-1", className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className={"select-class-2"} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>;
}
function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}) {
  return <SelectPrimitive.Portal>
      <SelectPrimitive.Content data-slot="select-content" className={cn("select-class-3", position === 'popper' && "select-class-4", className)} position={position} {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className={cn("select-class-5", position === 'popper' && "select-class-6")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>;
}
function SelectLabel({
  className,
  ...props
}) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn("select-class-7", className)} {...props} />;
}
function SelectItem({
  className,
  children,
  ...props
}) {
  return <SelectPrimitive.Item data-slot="select-item" className={cn("select-class-8", className)} {...props}>
      <span className={"select-class-9"}>
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className={"select-class-10"} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>;
}
function SelectSeparator({
  className,
  ...props
}) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn("select-class-11", className)} {...props} />;
}
function SelectScrollUpButton({
  className,
  ...props
}) {
  return <SelectPrimitive.ScrollUpButton data-slot="select-scroll-up-button" className={cn("select-class-12", className)} {...props}>
      <ChevronUpIcon className={"select-class-10"} />
    </SelectPrimitive.ScrollUpButton>;
}
function SelectScrollDownButton({
  className,
  ...props
}) {
  return <SelectPrimitive.ScrollDownButton data-slot="select-scroll-down-button" className={cn("select-class-12", className)} {...props}>
      <ChevronDownIcon className={"select-class-10"} />
    </SelectPrimitive.ScrollDownButton>;
}
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue };
