import { site } from "@/data/survey";
import { logout } from "@/app/admin/actions";

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2.5v8M4.5 7.5 8 11l3.5-3.5M2.5 13.5h11" />
    </svg>
  );
}

/** Site name + page title. Shared by the loading shell and the signed-in page. */
export function AdminTitle() {
  return (
    <div className="min-w-0">
      <p className="kicker">{site.name}</p>
      <h1 className="mt-3 font-serif text-[clamp(2.25rem,1.8rem+1.6vw,3rem)] leading-[1.1] font-medium text-sand">
        Responses
      </h1>
    </div>
  );
}

export function AdminHeader({ canExport }: { canExport: boolean }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6 border-b border-gold/30 pb-7">
      <AdminTitle />
      <div className="flex flex-wrap items-center gap-3">
        {canExport ? (
          // Plain links on purpose: these are file downloads from route handlers, not pages.
          <>
            <a href="/admin/export/xlsx" download className="admin-btn admin-btn-primary">
              <DownloadIcon />
              Export Excel
            </a>
            <a href="/admin/export" download className="admin-btn">
              Export CSV
            </a>
          </>
        ) : null}
        <form action={logout}>
          <button type="submit" className="admin-btn">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
