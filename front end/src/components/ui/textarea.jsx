import * as React from 'react';
import { cn } from '@/lib/utils';
import styles from "./textarea.module.css";
function Textarea({
  className,
  ...props
}) {
  return <textarea data-slot="textarea" className={cn(styles["textarea-class-1"], className)} {...props} />;
}
export { Textarea };
