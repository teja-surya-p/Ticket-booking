'use client';

import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import styles from "./input-group.module.css";
function InputGroup({
  className,
  ...props
}) {
  return <div data-slot="input-group" role="group" className={cn(styles["input-group-class-1"], styles["input-group-class-2"], styles["input-group-class-3"], styles["input-group-class-4"], styles["input-group-class-5"], styles["input-group-class-6"], styles["input-group-class-7"], styles["input-group-class-8"], className)} {...props} />;
}
const inputGroupAddonVariants = cva("text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium select-none [&>svg:not([class*='size-'])]:size-4 [&>kbd]:rounded-[calc(var(--radius)-5px)] group-data-[disabled=true]/input-group:opacity-50", {
  variants: {
    align: {
      'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
      'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]',
      'block-start': 'order-first w-full justify-start px-3 pt-3 [.border-b]:pb-3 group-has-[>input]/input-group:pt-2.5',
      'block-end': 'order-last w-full justify-start px-3 pb-3 [.border-t]:pt-3 group-has-[>input]/input-group:pb-2.5'
    }
  },
  defaultVariants: {
    align: 'inline-start'
  }
});
function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}) {
  return <div role="group" data-slot="input-group-addon" data-align={align} className={cn(inputGroupAddonVariants({
    align
  }), className)} onClick={e => {
    if (e.target.closest('button')) {
      return;
    }
    e.currentTarget.parentElement?.querySelector('input')?.focus();
  }} {...props} />;
}
const inputGroupButtonVariants = cva('text-sm shadow-none flex gap-2 items-center', {
  variants: {
    size: {
      xs: "h-6 gap-1 px-2 rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-3.5 has-[>svg]:px-2",
      sm: 'h-8 px-2.5 gap-1.5 rounded-md has-[>svg]:px-2.5',
      'icon-xs': 'size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0',
      'icon-sm': 'size-8 p-0 has-[>svg]:p-0'
    }
  },
  defaultVariants: {
    size: 'xs'
  }
});
function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}) {
  return <Button type={type} data-size={size} variant={variant} className={cn(inputGroupButtonVariants({
    size
  }), className)} {...props} />;
}
function InputGroupText({
  className,
  ...props
}) {
  return <span className={cn(styles["input-group-class-9"], className)} {...props} />;
}
function InputGroupInput({
  className,
  ...props
}) {
  return <Input data-slot="input-group-control" className={cn(styles["input-group-class-10"], className)} {...props} />;
}
function InputGroupTextarea({
  className,
  ...props
}) {
  return <Textarea data-slot="input-group-control" className={cn(styles["input-group-class-11"], className)} {...props} />;
}
export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput, InputGroupTextarea };
