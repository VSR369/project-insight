import { Eye, Pencil, Trash2, RotateCcw, Trash } from "lucide-react";
import { DataTableAction } from "./DataTable";

/**
 * Standard action set for master data tables.
 * Eliminates the repeated 5-action definition across 25+ pages.
 */
export function createMasterDataActions<TData extends { id: string; is_active: boolean }>(handlers: {
  onView: (item: TData) => void;
  onEdit: (item: TData) => void;
  onRestore: (id: string) => void;
  onDelete: (item: TData) => void;
}): DataTableAction<TData>[] {
  return [
    { label: "View", icon: <Eye className="h-4 w-4" />, onClick: handlers.onView },
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: handlers.onEdit },
    { label: "Activate", icon: <RotateCcw className="h-4 w-4" />, onClick: (i) => handlers.onRestore(i.id), show: (i) => !i.is_active },
    { label: "Delete", icon: <Trash className="h-4 w-4" />, variant: "destructive", onClick: handlers.onDelete, show: (i) => !i.is_active },
    { label: "Deactivate", icon: <Trash2 className="h-4 w-4" />, variant: "destructive", onClick: handlers.onDelete, show: (i) => i.is_active },
  ];
}
