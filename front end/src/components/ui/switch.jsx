'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';
import "./switch.module.css";
function Switch({
  className,
  ...props
}) {
  return <SwitchPrimitive.Root data-slot="switch" className={cn("peer switch-class-1", className)} {...props}>
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className={"switch-class-2"} />
    </SwitchPrimitive.Root>;
}
export { Switch };
