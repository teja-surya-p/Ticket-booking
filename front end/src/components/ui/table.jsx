'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import "./table.module.css";
function Table({
  className,
  ...props
}) {
  return <div data-slot="table-container" className={"table-class-1"}>
      <table data-slot="table" className={cn("table-class-2", className)} {...props} />
    </div>;
}
function TableHeader({
  className,
  ...props
}) {
  return <thead data-slot="table-header" className={cn("table-class-3", className)} {...props} />;
}
function TableBody({
  className,
  ...props
}) {
  return <tbody data-slot="table-body" className={cn("table-class-4", className)} {...props} />;
}
function TableFooter({
  className,
  ...props
}) {
  return <tfoot data-slot="table-footer" className={cn("table-class-5", className)} {...props} />;
}
function TableRow({
  className,
  ...props
}) {
  return <tr data-slot="table-row" className={cn("table-class-6", className)} {...props} />;
}
function TableHead({
  className,
  ...props
}) {
  return <th data-slot="table-head" className={cn("table-class-7", className)} {...props} />;
}
function TableCell({
  className,
  ...props
}) {
  return <td data-slot="table-cell" className={cn("table-class-8", className)} {...props} />;
}
function TableCaption({
  className,
  ...props
}) {
  return <caption data-slot="table-caption" className={cn("table-class-9", className)} {...props} />;
}
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
