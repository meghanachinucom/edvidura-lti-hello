import type { LabHandle, LabPack, PlaygroundId } from '../types';
import { mountCellTour } from './cell';
import { mountCircuit } from './circuit';
import { mountDigestive } from './digestive';
import { mountForces } from './forces';
import { mountFractionBar } from './fraction';
import { mountLightMirror } from './lightMirror';
import { mountPhotosynthesis } from './photosynthesis';
import { mountWaterCycle } from './waterCycle';
import { mountAiMesh } from './aiMesh';

export function mountPlayground(
  host: HTMLElement,
  pack: LabPack,
  onFocus?: (id: string) => void
): LabHandle {
  const scene = pack.scene;
  switch (pack.playground) {
    case 'cell_tour':
      return mountCellTour({ host, scene, onFocus });
    case 'circuit':
      return mountCircuit({ host, scene });
    case 'fraction_bar':
      return mountFractionBar({ host, scene });
    case 'photosynthesis':
      return mountPhotosynthesis({ host, scene });
    case 'water_cycle':
      return mountWaterCycle({ host, scene });
    case 'digestive':
      return mountDigestive({ host, scene, onFocus });
    case 'light_mirror':
      return mountLightMirror({ host, scene });
    case 'ai_mesh':
      return mountAiMesh({ host, scene });
    case 'forces':
    default:
      return mountForces({ host, scene });
  }
}

export const PLAYGROUND_LABELS: Record<PlaygroundId, string> = {
  forces: 'Force & motion (Class 9)',
  cell_tour: 'Cell — unit of life (Class 9)',
  circuit: 'Electric circuit (Class 7/10)',
  fraction_bar: 'Fractions (Class 6)',
  photosynthesis: 'Photosynthesis (Class 7)',
  water_cycle: 'Water cycle / monsoon (Class 6–7)',
  digestive: 'Digestion path (Class 7)',
  light_mirror: 'Reflection — plane mirror (Class 8/10)',
  ai_mesh: 'New topic → interactive 3D',
};
