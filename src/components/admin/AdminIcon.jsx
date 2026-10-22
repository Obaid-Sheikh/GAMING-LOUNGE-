export default function AdminIcon({ name, size = 20 }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="11" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="18" width="7" height="3" rx="1" /></>,
    floor: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z M9 3v15 M15 6v15" /></>,
    grid: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 10h16M10 4v16" /></>,
    console: <><path d="M7 8h10c3 0 5 10 3 11-2 1-4-3-5-3H9c-1 0-3 4-5 3C2 18 4 8 7 8Z M8 10v5M5.5 12.5h5M16 11h.01M18 14h.01" /></>,
    pc: <><rect x="3" y="3" width="18" height="13" rx="2" /><path d="M12 16v5M7 21h10M6 7h12" /></>,
    entertainment: <><rect x="3" y="3" width="18" height="13" rx="2" /><path d="m10 7 5 3-5 3ZM5 21v-2h14v2" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 6-3 7-3 9h18c0-2-3-3-3-9M10 21h4" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.grid}</svg>
}
