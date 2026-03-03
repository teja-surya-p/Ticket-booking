'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { PanelLeftIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import "./sidebar.module.css";
const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';
const SidebarContext = React.createContext(null);
function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }
  return context;
}
function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(value => {
    const openState = typeof value === 'function' ? value(open) : value;
    if (setOpenProp) {
      setOpenProp(openState);
    } else {
      _setOpen(openState);
    }

    // This sets the cookie to keep the sidebar state.
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  }, [setOpenProp, open]);

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile(open => !open) : setOpen(open => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? 'expanded' : 'collapsed';
  const contextValue = React.useMemo(() => ({
    state,
    open,
    setOpen,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleSidebar
  }), [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]);
  return <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div data-slot="sidebar-wrapper" style={{
        '--sidebar-width': SIDEBAR_WIDTH,
        '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
        ...style
      }} className={cn("sidebar-class-1", className)} {...props}>
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>;
}
function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}) {
  const {
    isMobile,
    state,
    openMobile,
    setOpenMobile
  } = useSidebar();
  if (collapsible === 'none') {
    return <div data-slot="sidebar" className={cn("sidebar-class-2", className)} {...props}>
        {children}
      </div>;
  }
  if (isMobile) {
    return <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent data-sidebar="sidebar" data-slot="sidebar" data-mobile="true" className={"sidebar-class-3"} style={{
        '--sidebar-width': SIDEBAR_WIDTH_MOBILE
      }} side={side}>
          <SheetHeader className={"sidebar-class-4"}>
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className={"sidebar-class-5"}>{children}</div>
        </SheetContent>
      </Sheet>;
  }
  return <div className={cn("group peer sidebar-class-6")} data-state={state} data-collapsible={state === 'collapsed' ? collapsible : ''} data-variant={variant} data-side={side} data-slot="sidebar">
      {/* This is what handles the sidebar gap on desktop */}
      <div data-slot="sidebar-gap" className={cn("sidebar-class-7", "sidebar-class-8", "sidebar-class-9", variant === 'floating' || variant === 'inset' ? "sidebar-class-10" : "sidebar-class-11")} />
      <div data-slot="sidebar-container" className={cn("sidebar-class-12", side === 'left' ? "sidebar-class-13" : "sidebar-class-14", variant === 'floating' || variant === 'inset' ? "sidebar-class-15" : "sidebar-class-16", className)} {...props}>
        <div data-sidebar="sidebar" data-slot="sidebar-inner" className={"sidebar-class-17"}>
          {children}
        </div>
      </div>
    </div>;
}
function SidebarTrigger({
  className,
  onClick,
  ...props
}) {
  const {
    toggleSidebar
  } = useSidebar();
  return <Button data-sidebar="trigger" data-slot="sidebar-trigger" variant="ghost" size="icon" className={cn("sidebar-class-18", className)} onClick={event => {
    onClick?.(event);
    toggleSidebar();
  }} {...props}>
      <PanelLeftIcon />
      <span className={"sidebar-class-4"}>Toggle Sidebar</span>
    </Button>;
}
function SidebarRail({
  className,
  ...props
}) {
  const {
    toggleSidebar
  } = useSidebar();
  return <button data-sidebar="rail" data-slot="sidebar-rail" aria-label="Toggle Sidebar" tabIndex={-1} onClick={toggleSidebar} title="Toggle Sidebar" className={cn("sidebar-class-19", "sidebar-class-20", "sidebar-class-21", "sidebar-class-22", "sidebar-class-23", "sidebar-class-24", className)} {...props} />;
}
function SidebarInset({
  className,
  ...props
}) {
  return <main data-slot="sidebar-inset" className={cn("sidebar-class-25", "sidebar-class-26", className)} {...props} />;
}
function SidebarInput({
  className,
  ...props
}) {
  return <Input data-slot="sidebar-input" data-sidebar="input" className={cn("sidebar-class-27", className)} {...props} />;
}
function SidebarHeader({
  className,
  ...props
}) {
  return <div data-slot="sidebar-header" data-sidebar="header" className={cn("sidebar-class-28", className)} {...props} />;
}
function SidebarFooter({
  className,
  ...props
}) {
  return <div data-slot="sidebar-footer" data-sidebar="footer" className={cn("sidebar-class-28", className)} {...props} />;
}
function SidebarSeparator({
  className,
  ...props
}) {
  return <Separator data-slot="sidebar-separator" data-sidebar="separator" className={cn("sidebar-class-29", className)} {...props} />;
}
function SidebarContent({
  className,
  ...props
}) {
  return <div data-slot="sidebar-content" data-sidebar="content" className={cn("sidebar-class-30", className)} {...props} />;
}
function SidebarGroup({
  className,
  ...props
}) {
  return <div data-slot="sidebar-group" data-sidebar="group" className={cn("sidebar-class-31", className)} {...props} />;
}
function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : 'div';
  return <Comp data-slot="sidebar-group-label" data-sidebar="group-label" className={cn("sidebar-class-32", "sidebar-class-33", className)} {...props} />;
}
function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="sidebar-group-action" data-sidebar="group-action" className={cn("sidebar-class-34", "sidebar-class-35", "sidebar-class-36", className)} {...props} />;
}
function SidebarGroupContent({
  className,
  ...props
}) {
  return <div data-slot="sidebar-group-content" data-sidebar="group-content" className={cn("sidebar-class-37", className)} {...props} />;
}
function SidebarMenu({
  className,
  ...props
}) {
  return <ul data-slot="sidebar-menu" data-sidebar="menu" className={cn("sidebar-class-38", className)} {...props} />;
}
function SidebarMenuItem({
  className,
  ...props
}) {
  return <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className={cn("sidebar-class-39", className)} {...props} />;
}
const sidebarMenuButtonVariants = cva('peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0', {
  variants: {
    variant: {
      default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      outline: 'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]'
    },
    size: {
      default: 'h-8 text-sm',
      sm: 'h-7 text-xs',
      lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'default'
  }
});
function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...props
}) {
  const Comp = asChild ? Slot : 'button';
  const {
    isMobile,
    state
  } = useSidebar();
  const button = <Comp data-slot="sidebar-menu-button" data-sidebar="menu-button" data-size={size} data-active={isActive} className={cn(sidebarMenuButtonVariants({
    variant,
    size
  }), className)} {...props} />;
  if (!tooltip) {
    return button;
  }
  if (typeof tooltip === 'string') {
    tooltip = {
      children: tooltip
    };
  }
  return <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" hidden={state !== 'collapsed' || isMobile} {...tooltip} />
    </Tooltip>;
}
function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="sidebar-menu-action" data-sidebar="menu-action" className={cn("sidebar-class-40", "sidebar-class-35", "sidebar-class-41", "sidebar-class-42", "sidebar-class-43", "sidebar-class-36", showOnHover && "sidebar-class-44", className)} {...props} />;
}
function SidebarMenuBadge({
  className,
  ...props
}) {
  return <div data-slot="sidebar-menu-badge" data-sidebar="menu-badge" className={cn("sidebar-class-45", "sidebar-class-46", "sidebar-class-41", "sidebar-class-42", "sidebar-class-43", "sidebar-class-36", className)} {...props} />;
}
function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}) {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);
  return <div data-slot="sidebar-menu-skeleton" data-sidebar="menu-skeleton" className={cn("sidebar-class-47", className)} {...props}>
      {showIcon && <Skeleton className={"sidebar-class-48"} data-sidebar="menu-skeleton-icon" />}
      <Skeleton className={"sidebar-class-49"} data-sidebar="menu-skeleton-text" style={{
      '--skeleton-width': width
    }} />
    </div>;
}
function SidebarMenuSub({
  className,
  ...props
}) {
  return <ul data-slot="sidebar-menu-sub" data-sidebar="menu-sub" className={cn("sidebar-class-50", "sidebar-class-36", className)} {...props} />;
}
function SidebarMenuSubItem({
  className,
  ...props
}) {
  return <li data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" className={cn("sidebar-class-51", className)} {...props} />;
}
function SidebarMenuSubButton({
  asChild = false,
  size = 'md',
  isActive = false,
  className,
  ...props
}) {
  const Comp = asChild ? Slot : 'a';
  return <Comp data-slot="sidebar-menu-sub-button" data-sidebar="menu-sub-button" data-size={size} data-active={isActive} className={cn("sidebar-class-52", "sidebar-class-53", size === 'sm' && "sidebar-class-54", size === 'md' && "sidebar-class-55", "sidebar-class-36", className)} {...props} />;
}
export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar };
