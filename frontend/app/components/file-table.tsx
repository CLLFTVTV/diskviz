import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FileRecord } from '~/lib/api';
import { formatBytes, formatDate } from '~/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { FileIcon, FolderIcon, ArrowUpDown } from 'lucide-react';

interface FileTableProps {
  data: FileRecord[];
  loading?: boolean;
}

export function FileTable({ data, loading }: FileTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<FileRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => {
          const val = info.getValue() as string;
          const ext = info.row.original.extension;
          return (
            <div className="flex items-center space-x-2">
              <FileIcon className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="truncate max-w-[200px]" title={val}>{val}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'parent_dir',
        header: 'Path',
        cell: (info) => (
          <div className="truncate max-w-[300px] text-muted-foreground text-xs" title={info.getValue() as string}>
            {info.getValue() as string}
          </div>
        ),
      },
      {
        accessorKey: 'extension',
        header: 'Type',
        cell: (info) => (
          <Badge variant="outline" className="text-xs">
            {info.getValue() as string || 'file'}
          </Badge>
        ),
      },
      {
        accessorKey: 'size',
        header: ({ column }) => (
          <div
            className="flex items-center cursor-pointer select-none"
            onClick={column.getToggleSortingHandler()}
          >
            Size <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        ),
        cell: (info) => <span className="font-mono">{formatBytes(info.getValue() as number)}</span>,
      },
      {
        accessorKey: 'mtime',
        header: ({ column }) => (
          <div
            className="flex items-center cursor-pointer select-none"
            onClick={column.getToggleSortingHandler()}
          >
            Modified <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        ),
        cell: (info) => <span className="text-muted-foreground">{formatDate(info.getValue() as number)}</span>,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Filter files..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground ml-auto">
          {rows.length} files
        </div>
      </div>
      <div className="rounded-md border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="h-[600px] overflow-auto relative">
             <Table>
               <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                 {table.getHeaderGroups().map((headerGroup) => (
                   <TableRow key={headerGroup.id}>
                     {headerGroup.headers.map((header) => (
                       <TableHead key={header.id}>
                         {flexRender(header.column.columnDef.header, header.getContext())}
                       </TableHead>
                     ))}
                   </TableRow>
                 ))}
               </TableHeader>
               <TableBody>
                 {rows.slice(0, 100).map((row) => (
                   <TableRow key={row.id}>
                     {row.getVisibleCells().map((cell) => (
                       <TableCell key={cell.id}>
                         {flexRender(cell.column.columnDef.cell, cell.getContext())}
                       </TableCell>
                     ))}
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
             {rows.length > 100 && (
               <div className="p-4 text-center text-sm text-muted-foreground border-t">
                 Showing first 100 results...
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
