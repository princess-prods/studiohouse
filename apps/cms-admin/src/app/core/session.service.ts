import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { MeResponse, MembershipSummary } from '@studiohouse/models';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

const STORAGE_KEY = 'studiohouse.activeStudio';

/**
 * The signed-in user's studio context, loaded from `GET /me`.
 *
 * Studio selection happens through membership: one membership is selected
 * automatically; several remember the last choice per browser.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);

  private readonly me = signal<MeResponse | null>(null);
  private readonly currentStatus = signal<SessionStatus>('idle');
  private readonly currentError = signal<string | null>(null);
  private readonly selectedStudioId = signal<string | null>(readStored());
  private inflight: Promise<void> | null = null;

  readonly status = this.currentStatus.asReadonly();
  readonly error = this.currentError.asReadonly();
  readonly user = computed(() => this.me()?.user ?? null);
  readonly memberships = computed(() => this.me()?.memberships ?? []);

  /** The active membership: the remembered one if still valid, else the first. */
  readonly membership = computed<MembershipSummary | null>(() => {
    const all = this.memberships();
    const wanted = this.selectedStudioId();
    return all.find((m) => m.studio.id === wanted) ?? all[0] ?? null;
  });
  readonly studio = computed(() => this.membership()?.studio ?? null);
  readonly role = computed(() => this.membership()?.role ?? null);
  readonly brands = computed(() => this.membership()?.brands ?? []);
  readonly canSwitchStudio = computed(() => this.memberships().length > 1);

  /** Loads `/me` once; concurrent callers share the request. */
  load(): Promise<void> {
    if (this.currentStatus() === 'ready') return Promise.resolve();
    this.inflight ??= this.fetch().finally(() => (this.inflight = null));
    return this.inflight;
  }

  /** Re-reads `/me`, for example after a brand is created. */
  refresh(): Promise<void> {
    this.currentStatus.set('idle');
    return this.load();
  }

  selectStudio(studioId: string): void {
    if (!this.memberships().some((m) => m.studio.id === studioId)) return;
    this.selectedStudioId.set(studioId);
    writeStored(studioId);
  }

  /** Forget everything, e.g. on sign-out. */
  clear(): void {
    this.me.set(null);
    this.currentStatus.set('idle');
    this.currentError.set(null);
  }

  private async fetch(): Promise<void> {
    this.currentStatus.set('loading');
    this.currentError.set(null);
    try {
      const me = await firstValueFrom(
        this.http.get<MeResponse>(`${environment.apiBaseUrl}/me`),
      );
      this.me.set(me);
      this.currentStatus.set('ready');
    } catch (err) {
      // HttpErrorResponse is not an Error subclass but carries a useful message.
      this.currentError.set(
        err instanceof HttpErrorResponse || err instanceof Error
          ? err.message
          : 'Could not load your studio.',
      );
      this.currentStatus.set('error');
    }
  }
}

function readStored(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStored(id: string): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode or blocked storage: selection just won't persist.
  }
}
