import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import "./breadcrumb.module.css";
function Breadcrumb({
  ...props
}) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}
function BreadcrumbList({
  className,
  ...props
}) {
  return <ol data-slot="breadcrumb-list" className={cn("breadcrumb-class-1", className)} {...props} />;
}
function BreadcrumbItem({
  className,
  ...props
}) {
  return <li data-slot="breadcrumb-item" className={cn("breadcrumb-class-2", className)} {...props} />;
}
function BreadcrumbLink({
  asChild,
  className,
  ...props
}) {
  const Comp = asChild ? Slot : 'a';
  return <Comp data-slot="breadcrumb-link" className={cn("breadcrumb-class-3", className)} {...props} />;
}
function BreadcrumbPage({
  className,
  ...props
}) {
  return <span data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" className={cn("breadcrumb-class-4", className)} {...props} />;
}
function BreadcrumbSeparator({
  children,
  className,
  ...props
}) {
  return <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn("breadcrumb-class-5", className)} {...props}>
      {children ?? <ChevronRight />}
    </li>;
}
function BreadcrumbEllipsis({
  className,
  ...props
}) {
  return <span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" className={cn("breadcrumb-class-6", className)} {...props}>
      <MoreHorizontal className={"breadcrumb-class-7"} />
      <span className={"breadcrumb-class-8"}>More</span>
    </span>;
}
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis };
