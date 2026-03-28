import { Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from "./spinner.module.css";
function Spinner({
  className,
  ...props
}) {
  return <Loader2Icon role="status" aria-label="Loading" className={cn(styles["spinner-class-1"], className)} {...props} />;
}
export { Spinner };
