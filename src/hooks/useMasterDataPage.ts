import * as React from "react";

/**
 * Generic hook that encapsulates the repeating dialog/selection state
 * found in every master data page (form open, view open, delete open, selected item).
 *
 * Reduces ~15 lines of useState + handler boilerplate per page to one call.
 */
export function useMasterDataPage<TData extends { id: string; is_active: boolean }>() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TData | null>(null);

  const openCreate = React.useCallback(() => {
    setSelected(null);
    setIsFormOpen(true);
  }, []);

  const openEdit = React.useCallback((item: TData) => {
    setSelected(item);
    setIsFormOpen(true);
  }, []);

  const openView = React.useCallback((item: TData) => {
    setSelected(item);
    setIsViewOpen(true);
  }, []);

  const openDelete = React.useCallback((item: TData) => {
    setSelected(item);
    setIsDeleteOpen(true);
  }, []);

  const switchToEdit = React.useCallback(() => {
    setIsViewOpen(false);
    setIsFormOpen(true);
  }, []);

  return {
    selected,
    isFormOpen,
    setIsFormOpen,
    isViewOpen,
    setIsViewOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    openCreate,
    openEdit,
    openView,
    openDelete,
    switchToEdit,
  };
}
