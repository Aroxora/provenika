import { Component, signal } from '@angular/core';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User,
} from 'firebase/auth';
import {
  getFirestore, doc, onSnapshot, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { ensureApp } from '../../core/firebase';

/** Only this Google account may flip the switch (also enforced by Firestore rules). */
const OWNER = 'daburu.dragon@gmail.com';

interface ControlDoc {
  sendEnabled?: boolean;
  autoReplyEnabled?: boolean;
  updatedBy?: string;
}

@Component({
  selector: 'app-admin',
  template: `
    <section class="hero card">
      <h2>Agent control <span class="muted">— owner only</span></h2>
      <p class="muted">
        Remote kill-switch for the autonomous outreach agent. Flipping <strong>Agentic takeover</strong>
        ON lets the agent send approved drafts and auto-reply to inbound (within caps). The local
        monitor reads this switch from Firestore every few seconds, so <strong>OFF stops it fast</strong>.
        Cold first-touches still require per-message approval in the CLI.
      </p>
    </section>

    @if (!ready()) {
      <p class="muted">Connecting…</p>
    } @else if (!user()) {
      <div class="card auth">
        <p>Sign in to manage the agent.</p>
        <button class="primary" (click)="login()">Sign in with Google</button>
        @if (error()) { <p class="err">{{ error() }}</p> }
      </div>
    } @else if (user()!.email !== OWNER) {
      <div class="card auth">
        <p class="err">{{ user()!.email }} is not authorized.</p>
        <button (click)="logout()">Sign out</button>
      </div>
    } @else {
      <div class="card panel">
        <div class="who muted">Signed in as {{ user()!.email }} · <a (click)="logout()">sign out</a></div>

        <div class="switchRow">
          <div>
            <div class="lbl">Agentic takeover</div>
            <div class="muted sub">Send approved drafts + auto-reply to inbound</div>
          </div>
          <button class="toggle" [class.on]="takeover()" (click)="setTakeover(!takeover())"
                  [disabled]="busy()" [attr.aria-pressed]="takeover()">
            <span class="knob"></span>
          </button>
        </div>

        <button class="kill" (click)="setTakeover(false)" [disabled]="busy()">■ OFF — stop the agent now</button>

        <div class="state muted">
          Current: send <strong [class.good]="state().sendEnabled">{{ state().sendEnabled ? 'ON' : 'off' }}</strong>,
          auto-reply <strong [class.good]="state().autoReplyEnabled">{{ state().autoReplyEnabled ? 'ON' : 'off' }}</strong>
          @if (state().updatedBy) { · last set by {{ state().updatedBy }} }
        </div>
        @if (error()) { <p class="err">{{ error() }}</p> }
      </div>
    }

    <p class="muted foot">
      This writes <code>control/outreach</code> in Firestore; the Mac-local monitor reads it over the
      Firestore REST API (no credentials on the device). Writes are locked to the owner by security rules.
    </p>
  `,
  styles: [`
    .hero h2 { margin-top: 0; }
    .hero p { max-width: 80ch; }
    .auth, .panel { display: grid; gap: 0.8rem; max-width: 520px; }
    .err { color: #ff6b6b; }
    .who a, .state a { color: var(--accent); cursor: pointer; }
    .switchRow { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .lbl { font-weight: 600; }
    .sub { font-size: 0.82rem; }
    .toggle { width: 56px; height: 30px; border-radius: 999px; background: #3a3a3a; border: 1px solid var(--border, #2a3b34); position: relative; cursor: pointer; transition: background .15s; }
    .toggle.on { background: var(--accent); }
    .toggle .knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; transition: left .15s; }
    .toggle.on .knob { left: 29px; }
    .kill { background: #5a1f1f; color: #ffd9d9; border: 1px solid #803030; padding: 0.6rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .kill:hover { background: #6e2626; }
    .state strong { color: var(--text-dim); } .state strong.good { color: var(--accent); }
    .foot { font-size: 0.78rem; margin-top: 1.2rem; max-width: 80ch; }
  `],
})
export class Admin {
  readonly OWNER = OWNER;
  readonly ready = signal(false);
  readonly user = signal<User | null>(null);
  readonly state = signal<ControlDoc>({});
  readonly busy = signal(false);
  readonly error = signal('');

  private db = getFirestore(ensureApp());
  private ref = doc(this.db, 'control', 'outreach');

  takeover = () => !!(this.state().sendEnabled && this.state().autoReplyEnabled);

  constructor() {
    const auth = getAuth(ensureApp());
    onAuthStateChanged(auth, (u) => {
      this.user.set(u);
      this.ready.set(true);
      if (u?.email === OWNER) {
        onSnapshot(this.ref, (snap) => this.state.set((snap.data() as ControlDoc) ?? {}),
          (e) => this.error.set(e.message));
      }
    });
  }

  async login() {
    this.error.set('');
    try {
      await signInWithPopup(getAuth(ensureApp()), new GoogleAuthProvider());
    } catch (e: any) {
      this.error.set(e?.message ?? 'sign-in failed');
    }
  }

  logout() { signOut(getAuth(ensureApp())); }

  async setTakeover(on: boolean) {
    this.busy.set(true);
    this.error.set('');
    try {
      await setDoc(this.ref, {
        sendEnabled: on, autoReplyEnabled: on,
        updatedBy: this.user()!.email, updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e: any) {
      this.error.set(e?.message ?? 'update failed');
    } finally {
      this.busy.set(false);
    }
  }
}
