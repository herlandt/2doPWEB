import { Routes } from '@angular/router';
import { ActividadesComponent } from './admin/actividades/actividades.component';
import { DepartamentosComponent } from './admin/departamentos/departamentos.component';
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { DiagramaEditorComponent } from './admin/diagramas/diagrama-editor.component';
import { DiagramaIaComponent } from './admin/diagramas/diagrama-ia.component';
import { DiagramasListaComponent } from './admin/diagramas/diagramas-lista.component';
import { DashboardMetricasComponent } from './admin/metricas/dashboard-metricas.component';
import { HistorialTramitesComponent } from './admin/historial/historial-tramites.component';
import { PoliticaFormComponent } from './admin/politicas/politica-form.component';
import { PoliticasListaComponent } from './admin/politicas/politicas-lista.component';
import { UsuarioFormComponent } from './admin/usuarios/usuario-form.component';
import { UsuariosListaComponent } from './admin/usuarios/usuarios-lista.component';
import { LoginComponent } from './auth/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';
import { BandejaEntradaComponent } from './funcionario/bandeja-entrada/bandeja-entrada.component';
import { ExpedienteDigitalComponent } from './funcionario/expediente-digital/expediente-digital.component';
import { TramiteDetalleComponent } from './funcionario/tramite-detalle/tramite-detalle.component';
import { TramitesListaComponent } from './funcionario/tramites-lista/tramites-lista.component';
import { NoAutorizadoComponent } from './shared/pages/no-autorizado.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{
		path: 'admin',
		canActivate: [authGuard, rolGuard],
		data: { roles: ['Administrador', 'SuperUser'] },
		children: [
			{ path: 'dashboard', component: DashboardComponent },
			{ path: 'usuarios', component: UsuariosListaComponent },
			{ path: 'usuarios/nuevo', component: UsuarioFormComponent },
			{ path: 'usuarios/:id/editar', component: UsuarioFormComponent },
			{ path: 'departamentos', component: DepartamentosComponent },
			{ path: 'politicas', component: PoliticasListaComponent },
			{ path: 'politicas/nueva', component: PoliticaFormComponent },
			{ path: 'politicas/:id/editar', component: PoliticaFormComponent },
			{ path: 'actividades', component: ActividadesComponent },
			{ path: 'diagramas', component: DiagramasListaComponent },
			{ path: 'diagramas/nuevo', component: DiagramaEditorComponent },
			{ path: 'diagramas/ia', component: DiagramaIaComponent },
			{ path: 'diagramas/:id', component: DiagramaEditorComponent },
			{ path: 'metricas', component: DashboardMetricasComponent },
			{ path: 'historial', component: HistorialTramitesComponent },
			{ path: 'expediente/:id', component: ExpedienteDigitalComponent },
		],
	},
	{
		path: 'funcionario',
		canActivate: [authGuard, rolGuard],
		data: { roles: ['Funcionario'] },
		children: [
			{ path: 'tramites', component: TramitesListaComponent },
			{ path: 'tramites/:id', component: TramiteDetalleComponent },
			{ path: 'bandeja', component: BandejaEntradaComponent },
			{ path: 'expediente/:id', component: ExpedienteDigitalComponent },
		],
	},
	{ path: 'no-autorizado', component: NoAutorizadoComponent },
	{ path: '', redirectTo: '/login', pathMatch: 'full' },
	{ path: '**', redirectTo: '/login' },
];
