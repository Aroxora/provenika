import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dossier' },
  { path: 'dossier', loadComponent: () => import('./features/dossier/dossier').then((m) => m.Dossier) },
  { path: 'triage', loadComponent: () => import('./features/triage/triage').then((m) => m.Triage) },
  { path: 'structure', loadComponent: () => import('./features/structure/structure').then((m) => m.Structure) },
  { path: 'cost-benefit', loadComponent: () => import('./features/cost-benefit/cost-benefit').then((m) => m.CostBenefitPage) },
  { path: 'trials', loadComponent: () => import('./features/trials/trials').then((m) => m.Trials) },
  { path: '**', redirectTo: 'dossier' },
];
