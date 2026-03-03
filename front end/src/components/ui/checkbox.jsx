'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import "./checkbox.module.css";
function Checkbox({
  className,
  ...props
}) {
  return <CheckboxPrimitive.Root data-slot="checkbox" className={cn("peer checkbox-class-1", className)} {...props}>
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className={"checkbox-class-2"}>
        <CheckIcon className={"checkbox-class-3"} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>;
}
export { Checkbox };
