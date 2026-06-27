import { Routes } from '@angular/router';

// Clean, user-friendly routes for the refactored site.
// Real functionality (target explorer), radical transparency (agent log), investor narrative.
//
// Old routes are redirected in parallel so that existing links, bookmarks,
// and any external references continue to work during the transition.
export const routes: Routes = [
  // New primary routes
  { path: '', pathMatch: 'full', loadComponent: () => import('./features/landing/landing').then(m => m.Landing) },
  { path: 'cure', loadComponent: () => import('./features/cure/cure').then(m => m.Cure) },
  { path: 'explore', loadComponent: () => import('./features/explorer/explorer').then(m => m.Explorer) },
  { path: 'log', loadComponent: () => import('./features/log/log').then(m => m.AgentLog) },
  { path: 'investors', loadComponent: () => import('./features/investors/investors').then(m => m.Investors) },
  { path: 'about', loadComponent: () => import('./features/about/about').then((m) => m.About) },
  { path: 'admin', loadComponent: () => import('./features/admin/admin').then((m) => m.Admin) },

  // Parallel redirects for old routes (preserve query params like ?t=EGFR where applicable)
  { path: 'overview', redirectTo: '', pathMatch: 'full' },
  { path: 'disease', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'dossier', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'triage', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'structure', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'cost-benefit', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'report', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'models', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'literature', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'pathways', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'trials', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'compare', redirectTo: 'explore', pathMatch: 'full' },

  // Old agentic pages now live under the unified log
  { path: 'outreach', redirectTo: 'log', pathMatch: 'full' },
  { path: 'status', redirectTo: 'log', pathMatch: 'full' },

  { path: '**', redirectTo: '' },
];
