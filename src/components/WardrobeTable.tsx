"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import Link from "next/link";

type ClothingItem = {
  id: number;
  name: string;
  created_at: string;
  product_img: string | null;
  tags: string;
  url: string;
  secondary_img: string | null;
  description: string;
  brand?: string;
  category?: string;
  color?: string;
};

const columns: ColumnDef<ClothingItem>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    header: "Item",
    accessorKey: "name",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-md">
            {item.product_img ? (
              <img
                src={item.product_img}
                alt={item.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/placeholder-image.jpg';
                }}
              />
            ) : (
              <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs text-gray-400">No img</span>
              </div>
            )}
          </div>
          <div className="font-medium">{item.name}</div>
        </div>
      );
    },
  },
  {
    header: "Brand",
    accessorKey: "brand",
    cell: ({ row }) => row.original.brand || "Unknown",
  },
  {
    header: "Category",
    accessorKey: "tags",
    cell: ({ row }) => (
      <Badge>
        {row.original.tags || "Uncategorized"}
      </Badge>
    ),
  },
  {
    header: "Added",
    accessorKey: "created_at",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="flex justify-end gap-2">
          <Link 
            href={`/item/${item.id}`}
            className="inline-flex h-8 items-center rounded-md bg-[#f0f0f0] px-3 text-xs font-medium hover:bg-[#e5e5e5] transition-colors"
            tabIndex={0}
            aria-label={`View details for ${item.name}`}
          >
            View
          </Link>
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center rounded-md bg-[#ff4d00] px-3 text-xs font-medium text-white hover:bg-opacity-90 transition-colors"
            tabIndex={0}
            aria-label={`Visit original product page for ${item.name}`}
          >
            Original
          </a>
        </div>
      );
    },
  },
];

export default function WardrobeTable({ items }: { items: ClothingItem[] }) {
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="bg-background rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No items in your wardrobe.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
