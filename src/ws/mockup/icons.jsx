/* global React, window */
// Lightweight SVG icon set. Stroke-based, 1.6 stroke, currentColor.

const I = ({ children, size = 16, ...rest }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round"
    className="ic" {...rest}
  >{children}</svg>
);

const Icon = {
  Search:   (p) => <I {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></I>,
  Library:  (p) => <I {...p}><path d="M4 5h6v14H4z"/><path d="M14 5h6v14h-6z"/></I>,
  Folder:   (p) => <I {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></I>,
  Chart:    (p) => <I {...p}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></I>,
  Settings: (p) => <I {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></I>,
  Plus:     (p) => <I {...p}><path d="M12 5v14"/><path d="M5 12h14"/></I>,
  Minus:    (p) => <I {...p}><path d="M5 12h14"/></I>,
  ArrowRight: (p) => <I {...p}><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></I>,
  ChevronRight: (p) => <I {...p}><path d="m9 6 6 6-6 6"/></I>,
  Check:    (p) => <I {...p}><path d="M5 12.5 10 17 19 7"/></I>,
  X:        (p) => <I {...p}><path d="M6 6l12 12"/><path d="M18 6 6 18"/></I>,
  Star:     (p) => <I {...p}><path d="m12 17.3-6.2 3.6 1.7-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.5 4.7 1.7 7z"/></I>,
  Bookmark: (p) => <I {...p}><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></I>,
  Clock:    (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>,
  Branch:   (p) => <I {...p}><circle cx="6" cy="5" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10"/><path d="M18 8c0 5-6 4-6 10"/></I>,
  Verified: (p) => <I {...p}><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></I>,
  Info:     (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></I>,
  Note:     (p) => <I {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></I>,
  Edit:     (p) => <I {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></I>,
  Pencil:   (p) => <I {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></I>,
  Question: (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.7.5-1.5 1-1.5 2"/><path d="M12 17h.01"/></I>,
  Checklist:(p) => <I {...p}><path d="m3 7 2 2 4-4"/><path d="M11 6h10"/><path d="m3 15 2 2 4-4"/><path d="M11 14h10"/></I>,
  Hand:     (p) => <I {...p}><path d="M18 11V6a2 2 0 0 0-4 0v6"/><path d="M14 10V4a2 2 0 0 0-4 0v8"/><path d="M10 10.5V6a2 2 0 0 0-4 0v9c0 4 3 7 7 7s7-3 7-7v-3a2 2 0 0 0-4 0"/></I>,
  Database: (p) => <I {...p}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></I>,
  Flag:     (p) => <I {...p}><path d="M4 21V4"/><path d="M4 4h14l-3 4 3 4H4"/></I>,
  Play:     (p) => <I {...p}><path d="M6 4l13 8-13 8z"/></I>,
  History:  (p) => <I {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></I>,
  Fit:      (p) => <I {...p}><path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M21 9V5a2 2 0 0 0-2-2h-4"/><path d="M3 15v4a2 2 0 0 0 2 2h4"/><path d="M21 15v4a2 2 0 0 1-2 2h-4"/></I>,
  Sun:      (p) => <I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.5 1.5"/><path d="m17.6 17.6 1.5 1.5"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 19.1 1.5-1.5"/><path d="m17.6 6.4 1.5-1.5"/></I>,
  Moon:     (p) => <I {...p}><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></I>,
  Trend:    (p) => <I {...p}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></I>,
  Coin:     (p) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M14 8.5c-.5-.8-1.4-1.2-2.5-1.2C10 7.3 9 8 9 9c0 2.5 5 1.5 5 4 0 1-1 1.7-2.5 1.7-1.1 0-2-.4-2.5-1.2"/><path d="M12 6v2"/><path d="M12 16v2"/></I>,
  Coin2:    (p) => <I {...p}><path d="M12 3 4 7l8 5 8-5z"/><path d="m4 12 8 5 8-5"/><path d="m4 17 8 5 8-5"/></I>,
  Doc:      (p) => <I {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></I>,
  User:     (p) => <I {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></I>,
  More:     (p) => <I {...p}><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></I>,
  Bell:     (p) => <I {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></I>,
};

window.Icon = Icon;

function Tag({ scheme, icon, children }) {
  const I2 = icon;
  return (
    <span className="tag" data-scheme={scheme}>
      {I2 ? <I2 size={11} /> : null}
      {children}
    </span>
  );
}
window.Tag = Tag;
