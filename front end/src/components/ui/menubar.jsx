'use client';

import * as React from 'react';
import * as MenubarPrimitive from '@radix-ui/react-menubar';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import "./menubar.module.css";
function Menubar({
  className,
  ...props
}) {
  return <MenubarPrimitive.Root data-slot="menubar" className={cn("menubar-class-1", className)} {...props} />;
}
function MenubarMenu({
  ...props
}) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />;
}
function MenubarGroup({
  ...props
}) {
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />;
}
function MenubarPortal({
  ...props
}) {
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />;
}
function MenubarRadioGroup({
  ...props
}) {
  return <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />;
}
function MenubarTrigger({
  className,
  ...props
}) {
  return <MenubarPrimitive.Trigger data-slot="menubar-trigger" className={cn("menubar-class-2", className)} {...props} />;
}
function MenubarContent({
  className,
  align = 'start',
  alignOffset = -4,
  sideOffset = 8,
  ...props
}) {
  return <MenubarPortal>
      <MenubarPrimitive.Content data-slot="menubar-content" align={align} alignOffset={alignOffset} sideOffset={sideOffset} className={cn("menubar-class-3", className)} {...props} />
    </MenubarPortal>;
}
function MenubarItem({
  className,
  inset,
  variant = 'default',
  ...props
}) {
  return <MenubarPrimitive.Item data-slot="menubar-item" data-inset={inset} data-variant={variant} className={cn("menubar-class-4", className)} {...props} />;
}
function MenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}) {
  return <MenubarPrimitive.CheckboxItem data-slot="menubar-checkbox-item" className={cn("menubar-class-5", className)} checked={checked} {...props}>
      <span className={"menubar-class-6"}>
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon className={"menubar-class-7"} />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>;
}
function MenubarRadioItem({
  className,
  children,
  ...props
}) {
  return <MenubarPrimitive.RadioItem data-slot="menubar-radio-item" className={cn("menubar-class-5", className)} {...props}>
      <span className={"menubar-class-6"}>
        <MenubarPrimitive.ItemIndicator>
          <CircleIcon className={"menubar-class-8"} />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>;
}
function MenubarLabel({
  className,
  inset,
  ...props
}) {
  return <MenubarPrimitive.Label data-slot="menubar-label" data-inset={inset} className={cn("menubar-class-9", className)} {...props} />;
}
function MenubarSeparator({
  className,
  ...props
}) {
  return <MenubarPrimitive.Separator data-slot="menubar-separator" className={cn("menubar-class-10", className)} {...props} />;
}
function MenubarShortcut({
  className,
  ...props
}) {
  return <span data-slot="menubar-shortcut" className={cn("menubar-class-11", className)} {...props} />;
}
function MenubarSub({
  ...props
}) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}
function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}) {
  return <MenubarPrimitive.SubTrigger data-slot="menubar-sub-trigger" data-inset={inset} className={cn("menubar-class-12", className)} {...props}>
      {children}
      <ChevronRightIcon className={"menubar-class-13"} />
    </MenubarPrimitive.SubTrigger>;
}
function MenubarSubContent({
  className,
  ...props
}) {
  return <MenubarPrimitive.SubContent data-slot="menubar-sub-content" className={cn("menubar-class-14", className)} {...props} />;
}
export { Menubar, MenubarPortal, MenubarMenu, MenubarTrigger, MenubarContent, MenubarGroup, MenubarSeparator, MenubarLabel, MenubarItem, MenubarShortcut, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarSub, MenubarSubTrigger, MenubarSubContent };
