import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TargetStore } from './core/target-store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private store = inject(TargetStore);
  readonly target = this.store.target;
  readonly draft = signal(this.store.target());

  readonly examples = ['EGFR', 'BTK', 'KRAS G12C', 'ALK', 'BRAF', 'PARP1', 'CDK4'];

  submit(value: string) {
    this.store.set(value);
  }

  pick(name: string) {
    this.draft.set(name);
    this.store.set(name);
  }
}
