'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { CircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import "./radio-group.module.css";
function RadioGroup({
  className,
  ...props
}) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("radio-group-class-1", className)} {...props} />;
}
function RadioGroupItem({
  className,
  ...props
}) {
  return <RadioGroupPrimitive.Item data-slot="radio-group-item" className={cn("radio-group-class-2", className)} {...props}>
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" className={"radio-group-class-3"}>
        <CircleIcon className={"radio-group-class-4"} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>;
}
export { RadioGroup, RadioGroupItem };
