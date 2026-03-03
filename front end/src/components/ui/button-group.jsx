import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import "./button-group.module.css";
const buttonGroupVariants = cva("flex w-fit items-stretch [&>*]:focus-visible:z-10 [&>*]:focus-visible:relative [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md has-[>[data-slot=button-group]]:gap-2", {
  variants: {
    orientation: {
      horizontal: '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none',
      vertical: 'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none'
    }
  },
  defaultVariants: {
    orientation: 'horizontal'
  }
});
function ButtonGroup({
  className,
  orientation,
  ...props
}) {
  return <div role="group" data-slot="button-group" data-orientation={orientation} className={cn(buttonGroupVariants({
    orientation
  }), className)} {...props} />;
}
function ButtonGroupText({
  className,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : 'div';
  return <Comp className={cn("button-group-class-1", className)} {...props} />;
}
function ButtonGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}) {
  return <Separator data-slot="button-group-separator" orientation={orientation} className={cn("button-group-class-2", className)} {...props} />;
}
export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
