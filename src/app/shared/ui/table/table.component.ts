import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { Subject, debounceTime } from 'rxjs';
import {
  LucideAngularModule,
  LucideIconData,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-angular';
import { ColumnDef, SortDir } from './column-def';
import { ColumnTemplateDirective } from './column.directive';
import { SkeletonComponent } from '../../skeleton/skeleton.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

type Row = Record<string, unknown>;

@Component({
  selector: 'app-table',
  imports: [
    NgTemplateOutlet,
    LucideAngularModule,
    SkeletonComponent,
    EmptyStateComponent,
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent {
  readonly columns = input.required<ColumnDef[]>();
  readonly data = input.required<Row[]>();
  readonly loading = input<boolean>(false);
  readonly searchable = input<boolean>(true);
  readonly searchPlaceholder = input<string>('Buscar...');
  readonly pageSize = input<number>(10);
  readonly emptyTitle = input<string>('Sin resultados');
  readonly emptyDescription = input<string>('No hay registros para mostrar.');
  readonly rowKey = input<string>('id');

  readonly rowClick = output<Row>();

  protected readonly cellTemplates = contentChildren(ColumnTemplateDirective);

  protected readonly searchInput = signal<string>('');
  protected readonly searchQuery = signal<string>('');
  protected readonly sortKey = signal<string>('');
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly currentPage = signal<number>(1);

  private readonly searchSubject = new Subject<string>();

  protected readonly icons = {
    sort: ArrowDownUp as LucideIconData,
    sortAsc: ArrowUp as LucideIconData,
    sortDesc: ArrowDown as LucideIconData,
    search: Search as LucideIconData,
    prev: ChevronLeft as LucideIconData,
    next: ChevronRight as LucideIconData,
    empty: Inbox as LucideIconData,
  };

  constructor() {
    this.searchSubject
      .pipe(debounceTime(250), takeUntilDestroyed())
      .subscribe((q) => {
        this.searchQuery.set(q.trim().toLowerCase());
        this.currentPage.set(1);
      });

    // Reset de página cuando cambian los datos.
    effect(() => {
      this.data();
      const total = this.totalPages();
      if (this.currentPage() > total) this.currentPage.set(Math.max(1, total));
    });
  }

  protected readonly filtered = computed<Row[]>(() => {
    const query = this.searchQuery();
    let rows = this.data();

    if (query && this.searchable()) {
      const cols = this.columns().filter((c) => c.searchable !== false);
      rows = rows.filter((row) =>
        cols.some((c) => {
          const value = this.readCell(row, c.key);
          return String(value ?? '').toLowerCase().includes(query);
        }),
      );
    }

    const sk = this.sortKey();
    if (sk) {
      const dir = this.sortDir();
      const mult = dir === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av = this.readCell(a, sk);
        const bv = this.readCell(b, sk);
        if (av == null && bv == null) return 0;
        if (av == null) return -1 * mult;
        if (bv == null) return 1 * mult;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
        return String(av).localeCompare(String(bv), 'es', { sensitivity: 'base' }) * mult;
      });
    }

    return rows;
  });

  protected readonly totalPages = computed(() => {
    const total = this.filtered().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  protected readonly paged = computed<Row[]>(() => {
    const ps = this.pageSize();
    const page = this.currentPage();
    return this.filtered().slice((page - 1) * ps, page * ps);
  });

  protected readonly pageSummary = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return '0 registros';
    const ps = this.pageSize();
    const start = (this.currentPage() - 1) * ps + 1;
    const end = Math.min(start + ps - 1, total);
    return `${start}–${end} de ${total}`;
  });

  protected onSearchInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.searchInput.set(v);
    this.searchSubject.next(v);
  }

  protected toggleSort(col: ColumnDef): void {
    if (col.sortable === false) return;
    if (this.sortKey() !== col.key) {
      this.sortKey.set(col.key);
      this.sortDir.set('asc');
      return;
    }
    if (this.sortDir() === 'asc') {
      this.sortDir.set('desc');
    } else {
      this.sortKey.set('');
      this.sortDir.set('asc');
    }
  }

  protected sortIcon(col: ColumnDef): LucideIconData {
    if (this.sortKey() !== col.key) return this.icons.sort;
    return this.sortDir() === 'asc' ? this.icons.sortAsc : this.icons.sortDesc;
  }

  protected templateForKey(key: string) {
    return this.cellTemplates().find((d) => d.key() === key)?.template ?? null;
  }

  protected readCell(row: Row, key: string): unknown {
    return key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Row)) {
        return (acc as Row)[part];
      }
      return undefined;
    }, row);
  }

  protected goPrev(): void {
    this.currentPage.update((p) => Math.max(1, p - 1));
  }
  protected goNext(): void {
    this.currentPage.update((p) => Math.min(this.totalPages(), p + 1));
  }

  protected trackRow = (idx: number, row: Row): unknown => row[this.rowKey()] ?? idx;
}
