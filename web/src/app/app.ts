import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';
import { TargetStore } from './core/target-store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private store = inject(TargetStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly target = this.store.target;
  readonly draft = signal(this.store.target());

  readonly examples = ['EGFR', 'BTK', 'KRAS G12C', 'ALK', 'BRAF', 'PARP1', 'CDK4'];

  constructor() {
    // Read shareable target from ?t= on load.
    const fromUrl = this.route.snapshot.queryParamMap.get('t');
    if (fromUrl) {
      this.store.set(fromUrl);
      this.draft.set(fromUrl);
    }
    // Keep ?t= in sync so links are shareable / reload-safe.
    effect(() => {
      const t = this.store.target();
      if (this.route.snapshot.queryParamMap.get('t') !== t) {
        this.router.navigate([], { queryParams: { t }, queryParamsHandling: 'merge', replaceUrl: true });
      }
    });
  }

  submit(value: string) {
    this.store.set(value);
  }

  pick(name: string) {
    this.draft.set(name);
    this.store.set(name);
  }
}
