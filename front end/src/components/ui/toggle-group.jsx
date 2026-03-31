'use client';

import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';
import { toggleVariants } from '@/components/ui/toggle';
import styles from "./toggle-group.module.css";
const ToggleGroupContext = React.createContext({
  size: 'default',
  variant: 'default'
});
function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}) {
  return <ToggleGroupPrimitive.Root data-slot="toggle-group" data-variant={variant} data-size={size} className={cn(styles["toggle-group-class-1"], className)} {...props}>
      <ToggleGroupContext.Provider value={{
      variant,
      size
    }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>;
}
function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}) {
  const context = React.useContext(ToggleGroupContext);
  return <ToggleGroupPrimitive.Item data-slot="toggle-group-item" data-variant={context.variant || variant} data-size={context.size || size} className={cn(toggleVariants({
    variant: context.variant || variant,
    size: context.size || size
  }), styles["toggle-group-class-2"], className)} {...props}>
      {children}
    </ToggleGroupPrimitive.Item>;
}
export { ToggleGroup, ToggleGroupItem };
