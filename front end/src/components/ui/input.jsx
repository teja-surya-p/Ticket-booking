import * as React from 'react';
import { cn } from '@/lib/utils';
import "./input.module.css";
function Input({
  className,
  type,
  ...props
}) {
  return <input type={type} data-slot="input" className={cn("input-class-1", "input-class-2", "input-class-3", className)} {...props} />;
}
export { Input };
