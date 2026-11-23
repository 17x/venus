import * as React from "react";

import { cn } from "../../lib/utils";

function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div data-slot="table-container" data-ui-scroll className="w-full min-w-0 max-w-full overflow-x-auto [contain:inline-size]">
      <table data-slot="table" className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead data-slot="table-header" className={cn("border-b", className)} {...props} />;
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot data-slot="table-footer" className={cn("border-t bg-muted/40 font-medium", className)} {...props} />;
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr data-slot="table-row" className={cn("border-b transition-colors hover:bg-muted/35", className)} {...props} />;
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      data-slot="table-head"
      className={cn("h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td data-slot="table-cell" className={cn("p-3 align-middle text-xs", className)} {...props} />;
}

function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption data-slot="table-caption" className={cn("mt-3 text-xs text-muted-foreground", className)} {...props} />;
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
