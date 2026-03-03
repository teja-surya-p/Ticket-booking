'use client';

import * as React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import "./context-menu.module.css";
function ContextMenu({
  ...props
}) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}
function ContextMenuTrigger({
  ...props
}) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}
function ContextMenuGroup({
  ...props
}) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}
function ContextMenuPortal({
  ...props
}) {
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />;
}
function ContextMenuSub({
  ...props
}) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}
function ContextMenuRadioGroup({
  ...props
}) {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />;
}
function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}) {
  return <ContextMenuPrimitive.SubTrigger data-slot="context-menu-sub-trigger" data-inset={inset} className={cn("context-menu-class-1", className)} {...props}>
      {children}
      <ChevronRightIcon className={"context-menu-class-2"} />
    </ContextMenuPrimitive.SubTrigger>;
}
function ContextMenuSubContent({
  className,
  ...props
}) {
  return <ContextMenuPrimitive.SubContent data-slot="context-menu-sub-content" className={cn("context-menu-class-3", className)} {...props} />;
}
function ContextMenuContent({
  className,
  ...props
}) {
  return <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content data-slot="context-menu-content" className={cn("context-menu-class-4", className)} {...props} />
    </ContextMenuPrimitive.Portal>;
}
function ContextMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}) {
  return <ContextMenuPrimitive.Item data-slot="context-menu-item" data-inset={inset} data-variant={variant} className={cn("context-menu-class-5", className)} {...props} />;
}
function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}) {
  return <ContextMenuPrimitive.CheckboxItem data-slot="context-menu-checkbox-item" className={cn("context-menu-class-6", className)} checked={checked} {...props}>
      <span className={"context-menu-class-7"}>
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className={"context-menu-class-8"} />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>;
}
function ContextMenuRadioItem({
  className,
  children,
  ...props
}) {
  return <ContextMenuPrimitive.RadioItem data-slot="context-menu-radio-item" className={cn("context-menu-class-6", className)} {...props}>
      <span className={"context-menu-class-7"}>
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon className={"context-menu-class-9"} />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>;
}
function ContextMenuLabel({
  className,
  inset,
  ...props
}) {
  return <ContextMenuPrimitive.Label data-slot="context-menu-label" data-inset={inset} className={cn("context-menu-class-10", className)} {...props} />;
}
function ContextMenuSeparator({
  className,
  ...props
}) {
  return <ContextMenuPrimitive.Separator data-slot="context-menu-separator" className={cn("context-menu-class-11", className)} {...props} />;
}
function ContextMenuShortcut({
  className,
  ...props
}) {
  return <span data-slot="context-menu-shortcut" className={cn("context-menu-class-12", className)} {...props} />;
}
export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup, ContextMenuPortal, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuRadioGroup };
