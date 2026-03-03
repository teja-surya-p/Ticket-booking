'use client';

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';
import "./scroll-area.module.css";
function ScrollArea({
  className,
  children,
  ...props
}) {
  return <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("scroll-area-class-1", className)} {...props}>
      <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className={"scroll-area-class-2"}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>;
}
function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}) {
  return <ScrollAreaPrimitive.ScrollAreaScrollbar data-slot="scroll-area-scrollbar" orientation={orientation} className={cn("scroll-area-class-3", orientation === 'vertical' && "scroll-area-class-4", orientation === 'horizontal' && "scroll-area-class-5", className)} {...props}>
      <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className={"scroll-area-class-6"} />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>;
}
export { ScrollArea, ScrollBar };
