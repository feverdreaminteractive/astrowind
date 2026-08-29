import { useRef } from 'react';
import { Move } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { NODE_REGISTRY, REGISTRY_KEYS, type NodeCategory, type RegistryKey } from './registry/nodeRegistry';
import { useDraggablePosition, getNavClearance } from './useDraggablePosition';

const SIDEBAR_MARGIN = 12; // matches the old static left-3 top-3 (0.75rem)

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
  autoFocus?: boolean;
  scrollbarVisible?: boolean;
}

// Persistent, always-visible scrollbar (rather than the OS's default
// hover/scroll-to-reveal overlay one) so the sidebar's scrollability is
// obvious at a glance now that the registry is long enough to overflow.
const VISIBLE_SCROLLBAR_CLASS =
  '[scrollbar-color:#525252_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-track]:bg-transparent';

// A searchable, grouped command list rather than a flat button stack -- the
// registry keeps growing (20+ node types and counting), so typing a few
// letters has to stay faster than scanning/scrolling a long list.
function PaletteList({ hasOutput, onAdd, autoFocus, scrollbarVisible }: PaletteListProps) {
  return (
    <Command className="rounded-none bg-transparent p-0" defaultValue="">
      <CommandInput autoFocus={autoFocus} placeholder="Search nodes…" className="text-neutral-200" />
      <CommandList className={`max-h-[min(60vh,28rem)] ${scrollbarVisible ? VISIBLE_SCROLLBAR_CLASS : ''}`}>
        <CommandEmpty className="text-neutral-500">No nodes found.</CommandEmpty>
        {CATEGORY_ORDER.map((category) => {
          const keys = REGISTRY_KEYS.filter((key) => NODE_REGISTRY[key].category === category);
          if (keys.length === 0) return null;
          return (
            <CommandGroup key={category} heading={CATEGORY_LABEL[category]}>
              {keys.map((key) => {
                const def = NODE_REGISTRY[key];
                const disabled = def.category === 'output' && hasOutput;
                return (
                  <CommandItem
                    key={key}
                    value={def.label}
                    disabled={disabled}
                    onSelect={() => onAdd(key)}
                    className="text-neutral-200 data-selected:bg-neutral-800 data-selected:text-neutral-100"
                  >
                    {def.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </Command>
  );
}

interface PaletteSidebarProps {
  hasOutput: boolean;
  onAdd: (key: RegistryKey) => void;
}

export function PaletteSidebar({ hasOutput, onAdd }: PaletteSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { position, dragHandleProps } = useDraggablePosition(
    panelRef,
    () => ({ left: SIDEBAR_MARGIN, top: getNavClearance() + SIDEBAR_MARGIN }),
    getNavClearance()
  );

  return (
    <div
      ref={panelRef}
      className="dark pointer-events-auto fixed z-20 w-60 rounded-lg border border-neutral-800 bg-neutral-950/90 shadow-xl backdrop-blur"
      style={{ left: position.left, top: position.top }}
    >
      <div
        {...dragHandleProps}
        className="nodrag nowheel flex h-5 touch-none cursor-move items-center justify-center rounded-t-lg bg-black/30 hover:bg-black/50"
        title="Drag to move"
      >
        <Move className="size-3 text-neutral-400" />
      </div>
      <div className="p-2">
        <PaletteList hasOutput={hasOutput} onAdd={onAdd} scrollbarVisible />
      </div>
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
        className="dark fixed z-50 w-60 rounded-lg border border-neutral-800 bg-neutral-950 p-2 shadow-2xl"
        style={{ left: x, top: y }}
      >
        <PaletteList hasOutput={hasOutput} onAdd={onAdd} autoFocus />
      </div>
    </>
  );
}
