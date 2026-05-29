import { Routes } from '@angular/router';
import { ActividadesComponent } from './admin/actividades/actividades.component';
import { DepartamentosComponent } from './admin/departamentos/departamentos.component';
import { DocumentosComponent } from './admin/documentos/documentos.component';
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { DiagramaEditorComponent } from './admin/diagramas/diagrama-editor.component';
import { DiagramaIaComponent } from './admin/diagramas/diagrama-ia.component';
import { DiagramasListaComponent } from './admin/diagramas/diagramas-lista.component';
import { DashboardMetricasComponent } from './admin/metricas/dashboard-metricas.component';
import { HistorialTramitesComponent } from './admin/historial/historial-tramites.component';
import { PoliticaFormComponent } from './admin/politicas/politica-form.component';
import { PoliticasListaComponent } from './admin/politicas/politicas-lista.component';
import { RepositorioComponent } from './admin/politicas/repositorio.component';
import { AnomaliasComponent } from './admin/anomalias/anomalias.component';
import { AuditoriaDocumentoComponent } from './admin/auditoria-documento/auditoria-documento.component';
import { ReportesNaturalesComponent } from './admin/reportes-naturales/reportes-naturales.component';
import { SugerirPoliticaComponent } from './admin/sugerir-politica/sugerir-politica.component';
import { UsuarioFormComponent } from './admin/usuarios/usuario-form.component';
import { UsuariosListaComponent } from './admin/usuarios/usuarios-lista.component';
import { LoginComponent } from './auth/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';
import { tramiteOwnershipGuard } from './core/guards/tramite-ownership.guard';
import { BandejaEntradaComponent } from './funcionario/bandeja-entrada/bandeja-entrada.component';
import { DocumentoEditorComponent } from './funcionario/documento-editor/documento-editor.component';
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
			{ path: 'documentos', component: DocumentosComponent },
			{ path: 'politicas', component: PoliticasListaComponent },
			{ path: 'politicas/nueva', component: PoliticaFormComponent },
			{ path: 'politicas/:id/editar', component: PoliticaFormComponent },
			{ path: 'politicas/:id/repositorio', component: RepositorioComponent },
			{ path: 'actividades', component: ActividadesComponent },
			{ path: 'diagramas', component: DiagramasListaComponent },
			{ path: 'diagramas/nuevo', component: DiagramaEditorComponent },
			{ path: 'diagramas/ia', component: DiagramaIaComponent },
			{ path: 'diagramas/:id', component: DiagramaEditorComponent },
			{ path: 'metricas', component: DashboardMetricasComponent },
			{ path: 'historial', component: HistorialTramitesComponent },
			{ path: 'anomalias', component: AnomaliasComponent },
			{ path: 'reportes-naturales', component: ReportesNaturalesComponent },
			{ path: 'sugerir-politica', component: SugerirPoliticaComponent },
			{ path: 'documentos/:id/auditoria', component: AuditoriaDocumentoComponent },
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
			{
				path: 'expediente/:id',
				component: ExpedienteDigitalComponent,
				canActivate: [tramiteOwnershipGuard],
			},
			{ path: 'documentos/:id/editar', component: DocumentoEditorComponent },
		],
	},
	{ path: 'no-autorizado', component: NoAutorizadoComponent },
	{ path: '', redirectTo: '/login', pathMatch: 'full' },
	{ path: '**', redirectTo: '/login' },
];
