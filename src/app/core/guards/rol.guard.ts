import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const rolGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const rolesPermitidos = (route.data['roles'] as string[] | undefined) ?? [];
  const rolUsuario = auth.getRol();

  if (rolesPermitidos.length === 0 || rolesPermitidos.includes(rolUsuario)) {
    return true;
  }

  return router.createUrlTree(['/no-autorizado']);
};
