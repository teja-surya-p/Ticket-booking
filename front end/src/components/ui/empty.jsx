import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import styles from "./empty.module.css";
function Empty({
  className,
  ...props
}) {
  return <div data-slot="empty" className={cn(styles["empty-class-1"], className)} {...props} />;
}
function EmptyHeader({
  className,
  ...props
}) {
  return <div data-slot="empty-header" className={cn(styles["empty-class-2"], className)} {...props} />;
}
const emptyMediaVariants = cva('flex shrink-0 items-center justify-center mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0', {
  variants: {
    variant: {
      default: 'bg-transparent',
      icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6"
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});
function EmptyMedia({
  className,
  variant = 'default',
  ...props
}) {
  return <div data-slot="empty-icon" data-variant={variant} className={cn(emptyMediaVariants({
    variant,
    className
  }))} {...props} />;
}
function EmptyTitle({
  className,
  ...props
}) {
  return <div data-slot="empty-title" className={cn(styles["empty-class-3"], className)} {...props} />;
}
function EmptyDescription({
  className,
  ...props
}) {
  return <div data-slot="empty-description" className={cn(styles["empty-class-4"], className)} {...props} />;
}
function EmptyContent({
  className,
  ...props
}) {
  return <div data-slot="empty-content" className={cn(styles["empty-class-5"], className)} {...props} />;
}
export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia };
