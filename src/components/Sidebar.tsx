// Collapsible sidebar panel container.

import type { ReactNode } from "react";

interface SidebarProps {
  open: boolean;
  children: ReactNode;
}

export function Sidebar({ open, children }: SidebarProps) {
  return <aside className={`sidebar ${open ? "" : "collapsed"}`}>{open && children}</aside>;
}
