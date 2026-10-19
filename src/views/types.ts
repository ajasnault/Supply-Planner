import type { Analysis } from '../engine/derived';
import type { NavProps, SiteSel } from '../ui/primitives';

export interface ViewProps {
  a: Analysis;
  site: SiteSel;
  onSite: (s: SiteSel) => void;
  nav: NavProps;
  openItem: (id: string) => void;
  openSupplier: (id: string) => void;
}
