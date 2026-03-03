import * as React from 'react';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import { cva } from 'class-variance-authority';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import "./navigation-menu.module.css";
function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}) {
  return <NavigationMenuPrimitive.Root data-slot="navigation-menu" data-viewport={viewport} className={cn("navigation-menu-class-1", className)} {...props}>
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>;
}
function NavigationMenuList({
  className,
  ...props
}) {
  return <NavigationMenuPrimitive.List data-slot="navigation-menu-list" className={cn("group navigation-menu-class-2", className)} {...props} />;
}
function NavigationMenuItem({
  className,
  ...props
}) {
  return <NavigationMenuPrimitive.Item data-slot="navigation-menu-item" className={cn("navigation-menu-class-3", className)} {...props} />;
}
const navigationMenuTriggerStyle = cva('group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:hover:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:focus:bg-accent data-[state=open]:bg-accent/50 focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1');
function NavigationMenuTrigger({
  className,
  children,
  ...props
}) {
  return <NavigationMenuPrimitive.Trigger data-slot="navigation-menu-trigger" className={cn(navigationMenuTriggerStyle(), "group navigation-menu-class-4", className)} {...props}>
      {children}{' '}
      <ChevronDownIcon className={"navigation-menu-class-5"} aria-hidden="true" />
    </NavigationMenuPrimitive.Trigger>;
}
function NavigationMenuContent({
  className,
  ...props
}) {
  return <NavigationMenuPrimitive.Content data-slot="navigation-menu-content" className={cn("navigation-menu-class-6", "navigation-menu-class-7", className)} {...props} />;
}
function NavigationMenuViewport({
  className,
  ...props
}) {
  return <div className={"navigation-menu-class-8"}>
      <NavigationMenuPrimitive.Viewport data-slot="navigation-menu-viewport" className={cn("navigation-menu-class-9", className)} {...props} />
    </div>;
}
function NavigationMenuLink({
  className,
  ...props
}) {
  return <NavigationMenuPrimitive.Link data-slot="navigation-menu-link" className={cn("navigation-menu-class-10", className)} {...props} />;
}
function NavigationMenuIndicator({
  className,
  ...props
}) {
  return <NavigationMenuPrimitive.Indicator data-slot="navigation-menu-indicator" className={cn("navigation-menu-class-11", className)} {...props}>
      <div className={"navigation-menu-class-12"} />
    </NavigationMenuPrimitive.Indicator>;
}
export { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuContent, NavigationMenuTrigger, NavigationMenuLink, NavigationMenuIndicator, NavigationMenuViewport, navigationMenuTriggerStyle };
