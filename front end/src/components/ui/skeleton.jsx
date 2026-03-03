import { cn } from '@/lib/utils';
import "./skeleton.module.css";
function Skeleton({
  className,
  ...props
}) {
  return <div data-slot="skeleton" className={cn("skeleton-class-1", className)} {...props} />;
}
export { Skeleton };
