import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import "./pagination.module.css";
function Pagination({
  className,
  ...props
}) {
  return <nav role="navigation" aria-label="pagination" data-slot="pagination" className={cn("pagination-class-1", className)} {...props} />;
}
function PaginationContent({
  className,
  ...props
}) {
  return <ul data-slot="pagination-content" className={cn("pagination-class-2", className)} {...props} />;
}
function PaginationItem({
  ...props
}) {
  return <li data-slot="pagination-item" {...props} />;
}
function PaginationLink({
  className,
  isActive,
  size = 'icon',
  ...props
}) {
  return <a aria-current={isActive ? 'page' : undefined} data-slot="pagination-link" data-active={isActive} className={cn(buttonVariants({
    variant: isActive ? "pagination-class-3" : "pagination-class-4",
    size
  }), className)} {...props} />;
}
function PaginationPrevious({
  className,
  ...props
}) {
  return <PaginationLink aria-label="Go to previous page" size="default" className={cn("pagination-class-5", className)} {...props}>
      <ChevronLeftIcon />
      <span className={"pagination-class-6"}>Previous</span>
    </PaginationLink>;
}
function PaginationNext({
  className,
  ...props
}) {
  return <PaginationLink aria-label="Go to next page" size="default" className={cn("pagination-class-7", className)} {...props}>
      <span className={"pagination-class-6"}>Next</span>
      <ChevronRightIcon />
    </PaginationLink>;
}
function PaginationEllipsis({
  className,
  ...props
}) {
  return <span aria-hidden data-slot="pagination-ellipsis" className={cn("pagination-class-8", className)} {...props}>
      <MoreHorizontalIcon className={"pagination-class-9"} />
      <span className={"pagination-class-10"}>More pages</span>
    </span>;
}
export { Pagination, PaginationContent, PaginationLink, PaginationItem, PaginationPrevious, PaginationNext, PaginationEllipsis };
