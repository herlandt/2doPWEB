import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  LucideIconData,
  LayoutDashboard,
  Users,
  Building2,
  ScrollText,
  Activity,
  Workflow,
  Sparkles,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Zap,
  Sun,
  Moon,
  Settings,
  GitBranch,
  Inbox,
  BarChart2,
  BookOpen,
  FileText,
} from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

interface NavItem {
  label: string;
  icon: LucideIconData;
  link: string;
  roles: ('admin' | 'funcionario')[];
}

interface NavGroup {
  label: string;
  icon: LucideIconData;
  expanded: WritableSignal<boolean>;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly icons = {
    dashboard:    LayoutDashboard as LucideIconData,
    users:        Users           as LucideIconData,
    departments:  Building2       as LucideIconData,
    policies:     ScrollText      as LucideIconData,
    activities:   Activity        as LucideIconData,
    documents:    FileText        as LucideIconData,
    workflows:    Workflow         as LucideIconData,
    aiSparkles:   Sparkles        as LucideIconData,
    tramites:     ClipboardList   as LucideIconData,
    chevronLeft:  ChevronLeft     as LucideIconData,
    chevronRight: ChevronRight    as LucideIconData,
    chevronDown:  ChevronDown     as LucideIconData,
    logout:       LogOut          as LucideIconData,
    brand:        Zap             as LucideIconData,
    sun:          Sun             as LucideIconData,
    moon:         Moon            as LucideIconData,
    settings:     Settings        as LucideIconData,
    flows:        GitBranch       as LucideIconData,
    bandeja:      Inbox           as LucideIconData,
    metricas:     BarChart2       as LucideIconData,
    historial:    BookOpen        as LucideIconData,
  };

  private readonly storageKey = 'cre.sidebar.collapsed';
  readonly collapsed = signal<boolean>(this.readInitialCollapsed());

  readonly role = computed<'admin' | 'funcionario' | null>(() => {
    if (this.auth.isAdmin()) return 'admin';
    if (this.auth.isFuncionario()) return 'funcionario';
    return null;
  });

  // ── Grupos desplegables (admin) ─────────────────────────────
  readonly groupGestion: NavGroup = {
    label: 'Gestión',
    icon: this.icons.settings,
    expanded: signal(true),
    items: [
      { label: 'Usuarios',      icon: this.icons.users,       link: '/admin/usuarios',      roles: ['admin'] },
      { label: 'Departamentos', icon: this.icons.departments, link: '/admin/departamentos', roles: ['admin'] },
      { label: 'Políticas',     icon: this.icons.policies,    link: '/admin/politicas',     roles: ['admin'] },
      { label: 'Actividades',   icon: this.icons.activities,  link: '/admin/actividades',   roles: ['admin'] },
      { label: 'Documentos',    icon: this.icons.documents,   link: '/admin/documentos',    roles: ['admin'] },
    ],
  };

  readonly groupFlujos: NavGroup = {
    label: 'Flujos',
    icon: this.icons.flows,
    expanded: signal(true),
    items: [
      { label: 'Diagramas',     icon: this.icons.workflows,  link: '/admin/diagramas',     roles: ['admin'] },
      { label: 'Diseño con IA', icon: this.icons.aiSparkles, link: '/admin/diagramas/ia',  roles: ['admin'] },
    ],
  };

  readonly groupAnalisis: NavGroup = {
    label: 'Análisis',
    icon: this.icons.metricas,
    expanded: signal(true),
    items: [
      { label: 'Métricas',  icon: this.icons.metricas,  link: '/admin/metricas',  roles: ['admin'] },
      { label: 'Historial', icon: this.icons.historial, link: '/admin/historial', roles: ['admin'] },
    ],
  };

  // Sección usuario (tema + logout) también desplegable
  readonly userExpanded = signal(true);

  // Lista plana — usada solo en collapsed para mostrar todos los íconos
  readonly flatItems: NavItem[] = [
    { label: 'Dashboard',     icon: this.icons.dashboard,   link: '/admin/dashboard',     roles: ['admin'] },
    { label: 'Usuarios',      icon: this.icons.users,       link: '/admin/usuarios',      roles: ['admin'] },
    { label: 'Departamentos', icon: this.icons.departments, link: '/admin/departamentos', roles: ['admin'] },
    { label: 'Políticas',     icon: this.icons.policies,    link: '/admin/politicas',     roles: ['admin'] },
    { label: 'Actividades',   icon: this.icons.activities,  link: '/admin/actividades',   roles: ['admin'] },
    { label: 'Documentos',    icon: this.icons.documents,   link: '/admin/documentos',    roles: ['admin'] },
    { label: 'Diagramas',     icon: this.icons.workflows,   link: '/admin/diagramas',     roles: ['admin'] },
    { label: 'Diseño con IA', icon: this.icons.aiSparkles,  link: '/admin/diagramas/ia',  roles: ['admin'] },
    { label: 'Métricas',      icon: this.icons.metricas,    link: '/admin/metricas',       roles: ['admin'] },
    { label: 'Historial',     icon: this.icons.historial,   link: '/admin/historial',      roles: ['admin'] },
    { label: 'Mis Trámites',  icon: this.icons.tramites,    link: '/funcionario/tramites', roles: ['funcionario'] },
    { label: 'Bandeja',       icon: this.icons.bandeja,     link: '/funcionario/bandeja',  roles: ['funcionario'] },
  ];

  readonly visibleFlatItems = computed(() => {
    const r = this.role();
    if (!r) return [];
    return this.flatItems.filter((i) => i.roles.includes(r));
  });

  // ── Acciones ────────────────────────────────────────────────
  toggle(): void {
    this.collapsed.update((v) => !v);
    if (this.isBrowser) {
      localStorage.setItem(this.storageKey, this.collapsed() ? '1' : '0');
    }
  }

  toggleGroup(group: NavGroup): void {
    if (this.collapsed()) {
      this.collapsed.set(false);
      if (this.isBrowser) localStorage.setItem(this.storageKey, '0');
    }
    group.expanded.update((v) => !v);
  }

  toggleUser(): void {
    if (this.collapsed()) {
      this.collapsed.set(false);
      if (this.isBrowser) localStorage.setItem(this.storageKey, '0');
    }
    this.userExpanded.update((v) => !v);
  }

  private readInitialCollapsed(): boolean {
    if (!this.isBrowser) return false;
    return localStorage.getItem(this.storageKey) === '1';
  }
}
