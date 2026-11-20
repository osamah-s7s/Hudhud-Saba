/** Disclosure arrow; rotates when its <details> is open (see .admin-chevron). */
export function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      className="admin-chevron flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}
