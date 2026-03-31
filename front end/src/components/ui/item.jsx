import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import styles from "./item.module.css";
function ItemGroup({
  className,
  ...props
}) {
  return <div role="list" data-slot="item-group" className={cn(styles["item-class-1"], className)} {...props} />;
}
function ItemSeparator({
  className,
  ...props
}) {
  return <Separator data-slot="item-separator" orientation="horizontal" className={cn(styles["item-class-2"], className)} {...props} />;
}
const itemVariants = cva('group/item flex items-center border border-transparent text-sm rounded-md transition-colors [a&]:hover:bg-accent/50 [a&]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]', {
  variants: {
    variant: {
      default: 'bg-transparent',
      outline: 'border-border',
      muted: 'bg-muted/50'
    },
    size: {
      default: 'p-4 gap-4 ',
      sm: 'py-3 px-4 gap-2.5'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'default'
  }
});
function Item({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : 'div';
  return <Comp data-slot="item" data-variant={variant} data-size={size} className={cn(itemVariants({
    variant,
    size,
    className
  }))} {...props} />;
}
const itemMediaVariants = cva('flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none group-has-[[data-slot=item-description]]/item:translate-y-0.5', {
  variants: {
    variant: {
      default: 'bg-transparent',
      icon: "size-8 border rounded-sm bg-muted [&_svg:not([class*='size-'])]:size-4",
      image: 'size-10 rounded-sm overflow-hidden [&_img]:size-full [&_img]:object-cover'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});
function ItemMedia({
  className,
  variant = 'default',
  ...props
}) {
  return <div data-slot="item-media" data-variant={variant} className={cn(itemMediaVariants({
    variant,
    className
  }))} {...props} />;
}
function ItemContent({
  className,
  ...props
}) {
  return <div data-slot="item-content" className={cn(styles["item-class-3"], className)} {...props} />;
}
function ItemTitle({
  className,
  ...props
}) {
  return <div data-slot="item-title" className={cn(styles["item-class-4"], className)} {...props} />;
}
function ItemDescription({
  className,
  ...props
}) {
  return <p data-slot="item-description" className={cn(styles["item-class-5"], styles["item-class-6"], className)} {...props} />;
}
function ItemActions({
  className,
  ...props
}) {
  return <div data-slot="item-actions" className={cn(styles["item-class-7"], className)} {...props} />;
}
function ItemHeader({
  className,
  ...props
}) {
  return <div data-slot="item-header" className={cn(styles["item-class-8"], className)} {...props} />;
}
function ItemFooter({
  className,
  ...props
}) {
  return <div data-slot="item-footer" className={cn(styles["item-class-8"], className)} {...props} />;
}
export { Item, ItemMedia, ItemContent, ItemActions, ItemGroup, ItemSeparator, ItemTitle, ItemDescription, ItemHeader, ItemFooter };
