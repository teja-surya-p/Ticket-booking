import { cn } from '@/lib/utils';
import styles from "./skeleton.module.css";
function Skeleton({
  className,
  ...props
}) {
  return <div data-slot="skeleton" className={cn(styles["skeleton-class-1"], className)} {...props} />;
}
export { Skeleton };
