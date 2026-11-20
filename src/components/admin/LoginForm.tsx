"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const error = state?.error;

  return (
    <form action={formAction} className="mt-10 space-y-5">
      <div>
        <label htmlFor="admin-username" className="admin-label">
          Username
        </label>
        <input
          id="admin-username"
          name="username"
          type="text"
          className="admin-input"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={256}
          required
          // Sign-in is this page's only purpose, so focus goes straight to it.
          autoFocus
          defaultValue={state?.username ?? ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>

      <div>
        <label htmlFor="admin-password" className="admin-label">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          className="admin-input"
          autoComplete="current-password"
          maxLength={256}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>

      {/* Always in the DOM, so screen readers announce the message when it appears. */}
      <div id="login-error" role="alert">
        {error ? <p className="field-error">{error}</p> : null}
      </div>

      <button
        type="submit"
        className="btn-gold w-full"
        aria-disabled={pending}
        // Stay focusable while pending; just ignore repeat submissions.
        onClick={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
