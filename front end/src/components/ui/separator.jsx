'use client';

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';
import "./separator.module.css";
function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}) {
  return <SeparatorPrimitive.Root data-slot="separator" decorative={decorative} orientation={orientation} className={cn("separator-class-1", className)} {...props} />;
}
export { Separator };
