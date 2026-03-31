'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
import styles from "./tooltip.module.css";
function TooltipProvider({
  delayDuration = 0,
  ...props
}) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}
function Tooltip({
  ...props
}) {
  return <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>;
}
function TooltipTrigger({
  ...props
}) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}) {
  return <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content data-slot="tooltip-content" sideOffset={sideOffset} className={cn(styles["tooltip-class-1"], className)} {...props}>
        {children}
        <TooltipPrimitive.Arrow className={styles["tooltip-class-2"]} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>;
}
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
