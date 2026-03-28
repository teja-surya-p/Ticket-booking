import * as React from 'react';
import { cn } from '@/lib/utils';
import styles from "./input.module.css";
function Input({
  className,
  type,
  ...props
}) {
  return <input type={type} data-slot="input" className={cn(styles["input-class-1"], styles["input-class-2"], styles["input-class-3"], className)} {...props} />;
}
export { Input };
