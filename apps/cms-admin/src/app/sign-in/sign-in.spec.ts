import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  AuthService,
  NEON_AUTH_CLIENT,
  NeonAuthClient,
  provideNeonAuth,
} from '@studiohouse/auth';
import { SignIn } from './sign-in';

function client(overrides: Partial<NeonAuthClient> = {}): NeonAuthClient {
  let signedIn = false;
  return {
    signIn: {
      email: async () => {
        signedIn = true;
        return { error: null };
      },
    },
    signUp: {
      email: async () => {
        signedIn = true;
        return { error: null };
      },
    },
    signOut: async () => undefined,
    getSession: async () => ({
      data: signedIn
        ? { user: { id: 'u', email: 'o@x.test', name: 'O' } }
        : null,
    }),
    token: async () => ({ data: { token: 't' } }),
    ...overrides,
  };
}

async function mount(authClient: NeonAuthClient, url = '/sign-in') {
  await TestBed.configureTestingModule({
    imports: [SignIn],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      provideNeonAuth({ url: 'https://auth.example.test/neondb/auth' }),
      { provide: NEON_AUTH_CLIENT, useValue: authClient },
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  const navigate = vi.spyOn(router, 'navigateByUrl');
  const fixture = TestBed.createComponent(SignIn);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const fill = (id: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) throw new Error(`no #${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el, fill, submit, navigate };
}

describe('SignIn', () => {
  it('signs in and returns to the requested page', async () => {
    const { fill, submit, navigate } = await mount(
      client(),
      '/sign-in?returnTo=%2Fbrands',
    );
    fill('email', 'o@x.test');
    fill('password', 'password1');
    await submit();
    expect(navigate).toHaveBeenLastCalledWith('/brands');
    expect(TestBed.inject(AuthService).isSignedIn()).toBe(true);
  });

  it('ignores an unsafe returnTo and goes home', async () => {
    const { fill, submit, navigate } = await mount(
      client(),
      '/sign-in?returnTo=https%3A%2F%2Fevil.test',
    );
    fill('email', 'o@x.test');
    fill('password', 'password1');
    await submit();
    expect(navigate).toHaveBeenLastCalledWith('/');
  });

  it('switches to sign-up, shows the name field, and signs up', async () => {
    const signUp = vi.fn(async () => ({ error: null }));
    const { el, fixture, fill, submit } = await mount(
      client({ signUp: { email: signUp } }),
    );
    expect(el.querySelector('#name')).toBeNull();
    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Need an account'))
      ?.click();
    fixture.detectChanges();
    await fixture.whenStable(); // let NgModel register the new name control
    expect(el.querySelector('h1')?.textContent).toContain(
      'Create your account',
    );
    fill('name', 'Owner');
    fill('email', 'o@x.test');
    fill('password', 'password1');
    await submit();
    expect(signUp).toHaveBeenCalledWith({
      name: 'Owner',
      email: 'o@x.test',
      password: 'password1',
    });
  });

  it('shows the provider error and stays on the page', async () => {
    const { el, fill, submit, navigate } = await mount(
      client({
        signIn: {
          email: async () => ({ error: { message: 'Wrong password' } }),
        },
      }),
    );
    fill('email', 'o@x.test');
    fill('password', 'nope');
    await submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Wrong password',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a generic message for unexpected failures', async () => {
    const { el, fill, submit } = await mount(
      client({
        signIn: {
          email: async () => {
            throw new Error('network down');
          },
        },
      }),
    );
    fill('email', 'o@x.test');
    fill('password', 'password1');
    await submit();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Something went wrong',
    );
  });

  it('ignores a second submit while one is in flight', async () => {
    let resolve!: (v: { error: null }) => void;
    const signIn = vi.fn(
      () => new Promise<{ error: null }>((r) => (resolve = r)),
    );
    const { el, fixture, fill } = await mount(
      client({ signIn: { email: signIn } }),
    );
    fill('email', 'o@x.test');
    fill('password', 'password1');
    const form = el.querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    form?.dispatchEvent(new Event('submit'));
    expect(signIn).toHaveBeenCalledTimes(1);
    resolve({ error: null });
    await fixture.whenStable();
  });
});
