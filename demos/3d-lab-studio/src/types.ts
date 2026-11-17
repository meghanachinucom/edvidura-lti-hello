import type { SceneConfig } from './sceneConfig';

export type PlaygroundId =
  | 'forces'
  | 'cell_tour'
  | 'circuit'
  | 'fraction_bar'
  | 'photosynthesis'
  | 'water_cycle'
  | 'digestive'
  | 'light_mirror'
  | 'ai_mesh';

export type Callout = {
  id: string;
  label: string;
  body: string;
};

export type LabPack = {
  id: string;
  title: string;
  bodyMd: string;
  playground: PlaygroundId;
  callouts: Callout[];
  /** Chapter-driven chrome for the fixed 3D template */
  scene?: SceneConfig;
  status: 'draft' | 'published';
  note: string;
  updatedAt: string;
};

export type LabHandle = {
  dispose: () => void;
  focus?: (id: string) => void;
};

export type RuntimeOpts = {
  host: HTMLElement;
  scene?: SceneConfig | null;
  onFocus?: (id: string) => void;
};
