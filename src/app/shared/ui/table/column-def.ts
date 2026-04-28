export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

export type SortDir = 'asc' | 'desc';
