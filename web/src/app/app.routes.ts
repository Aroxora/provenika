import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: 'overview', loadComponent: () => import('./features/overview/overview').then((m) => m.Overview) },
  { path: 'dossier', loadComponent: () => import('./features/dossier/dossier').then((m) => m.Dossier) },
  { path: 'triage', loadComponent: () => import('./features/triage/triage').then((m) => m.Triage) },
  { path: 'structure', loadComponent: () => import('./features/structure/structure').then((m) => m.Structure) },
  { path: 'cost-benefit', loadComponent: () => import('./features/cost-benefit/cost-benefit').then((m) => m.CostBenefitPage) },
  { path: 'literature', loadComponent: () => import('./features/literature/literature').then((m) => m.Literature) },
  { path: 'pathways', loadComponent: () => import('./features/pathways/pathways').then((m) => m.Pathways) },
  { path: 'trials', loadComponent: () => import('./features/trials/trials').then((m) => m.Trials) },
  { path: 'report', loadComponent: () => import('./features/report/report').then((m) => m.Report) },
  { path: '**', redirectTo: 'overview' },
];
