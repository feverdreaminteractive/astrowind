import { Button } from '@/components/ui/button';
import { NODE_REGISTRY, REGISTRY_KEYS, type NodeCategory, type RegistryKey } from './registry/nodeRegistry';

const CATEGORY_LABEL: Record<NodeCategory, string> = {
  source: 'Sources',
  feedback: 'Feedback',
  effect: 'Effects',
  blend: 'Blend',
  output: 'Output',
};

const CATEGORY_ORDER: NodeCategory[] = ['source', 'feedback', 'effect', 'blend', 'output'];

interface PaletteListProps {
  hasOutput: boolean;
  onAdd: (key: RegistryKey) => void;
}

function PaletteList({ hasOutput, onAdd }: PaletteListProps) {
  return (
    <div className="flex flex-col gap-3">
      {CATEGORY_ORDER.map((category) => {
        const keys = REGISTRY_KEYS.filter((key) => NODE_REGISTRY[key].category === category);
        if (keys.length === 0) return null;
        return (
          <div key={category}>
            <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              {CATEGORY_LABEL[category]}
            </div>
            <div className="flex flex-col gap-1">
              {keys.map((key) => {
                const def = NODE_REGISTRY[key];
                const disabled = def.category === 'output' && hasOutput;
                return (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="justify-start text-neutral-200"
                    onClick={() => onAdd(key)}
                  >
                    {def.label}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PaletteSidebarProps {
  hasOutput: boolean;
  onAdd: (key: RegistryKey) => void;
}

export function PaletteSidebar({ hasOutput, onAdd }: PaletteSidebarProps) {
  return (
    <div className="pointer-events-auto w-44 rounded-lg border border-neutral-800 bg-neutral-950/90 p-2 shadow-xl backdrop-blur">
      <PaletteList hasOutput={hasOutput} onAdd={onAdd} />
    </div>
  );
}

interface PaletteContextMenuProps {
  x: number;
  y: number;
  hasOutput: boolean;
  onAdd: (key: RegistryKey) => void;
  onClose: () => void;
}

export function PaletteContextMenu({ x, y, hasOutput, onAdd, onClose }: PaletteContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-50 w-44 rounded-lg border border-neutral-800 bg-neutral-950 p-2 shadow-2xl"
        style={{ left: x, top: y }}
      >
        <PaletteList hasOutput={hasOutput} onAdd={onAdd} />
      </div>
    </>
  );
}
