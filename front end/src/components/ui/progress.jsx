'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';
import styles from "./progress.module.css";
function Progress({
  className,
  value,
  ...props
}) {
  return <ProgressPrimitive.Root data-slot="progress" className={cn(styles["progress-class-1"], className)} {...props}>
      <ProgressPrimitive.Indicator data-slot="progress-indicator" className={styles["progress-class-2"]} style={{
      transform: `translateX(-${100 - (value || 0)}%)`
    }} />
    </ProgressPrimitive.Root>;
}
export { Progress };
