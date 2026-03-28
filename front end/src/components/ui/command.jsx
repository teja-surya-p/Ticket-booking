'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import styles from "./command.module.css";
function Command({
  className,
  ...props
}) {
  return <CommandPrimitive data-slot="command" className={cn(styles["command-class-1"], className)} {...props} />;
}
function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = true,
  ...props
}) {
  return <Dialog {...props}>
      <DialogHeader className={styles["command-class-2"]}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className={cn(styles["command-class-3"], className)} showCloseButton={showCloseButton}>
        <Command className={styles["command-class-4"]}>
          {children}
        </Command>
      </DialogContent>
    </Dialog>;
}
function CommandInput({
  className,
  ...props
}) {
  return <div data-slot="command-input-wrapper" className={styles["command-class-5"]}>
      <SearchIcon className={styles["command-class-6"]} />
      <CommandPrimitive.Input data-slot="command-input" className={cn(styles["command-class-7"], className)} {...props} />
    </div>;
}
function CommandList({
  className,
  ...props
}) {
  return <CommandPrimitive.List data-slot="command-list" className={cn(styles["command-class-8"], className)} {...props} />;
}
function CommandEmpty({
  ...props
}) {
  return <CommandPrimitive.Empty data-slot="command-empty" className={styles["command-class-9"]} {...props} />;
}
function CommandGroup({
  className,
  ...props
}) {
  return <CommandPrimitive.Group data-slot="command-group" className={cn(styles["command-class-10"], className)} {...props} />;
}
function CommandSeparator({
  className,
  ...props
}) {
  return <CommandPrimitive.Separator data-slot="command-separator" className={cn(styles["command-class-11"], className)} {...props} />;
}
function CommandItem({
  className,
  ...props
}) {
  return <CommandPrimitive.Item data-slot="command-item" className={cn(styles["command-class-12"], className)} {...props} />;
}
function CommandShortcut({
  className,
  ...props
}) {
  return <span data-slot="command-shortcut" className={cn(styles["command-class-13"], className)} {...props} />;
}
export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator };
