'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';
import "./label.module.css";
function Label({
  className,
  ...props
}) {
  return <LabelPrimitive.Root data-slot="label" className={cn("label-class-1", className)} {...props} />;
}
export { Label };
