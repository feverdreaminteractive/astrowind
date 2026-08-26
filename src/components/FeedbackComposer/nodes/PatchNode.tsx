import { useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getNodeDef, type NodeCategory } from '../registry/nodeRegistry';
import { useEngine } from '../engine/EngineContext';
import ParamControl from './ParamControl';
import type { PatchGraphNode } from './patchTypes';

const CATEGORY_ACCENT: Record<NodeCategory, string> = {
  source: 'border-t-amber-500',
  feedback: 'border-t-fuchsia-500',
  effect: 'border-t-sky-500',
  blend: 'border-t-emerald-500',
  output: 'border-t-neutral-300',
};

export default function PatchNode({ id, data, selected }: NodeProps<PatchGraphNode>) {
  const def = getNodeDef(data.registryKey);
  const engine = useEngine();
  const { updateNodeData } = useReactFlow();
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const canvas = thumbRef.current;
    if (!canvas || def.category === 'output') return;
    engine.registerThumbnailCanvas(id, canvas);
    return () => engine.unregisterThumbnailCanvas(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleParamChange = (key: string, value: number | string) => {
    updateNodeData(id, { params: { ...data.params, [key]: value } });
  };

  const handleImageFile = (file: File | undefined) => {
    if (file) void engine.loadImage(id, file);
  };

  return (
    <Card size="sm" className={`w-64 border-t-2 ${CATEGORY_ACCENT[def.category]} ${selected ? 'ring-2 ring-fuchsia-400' : ''} bg-neutral-900/95 shadow-xl`}>
      <div className="flex items-center justify-between px-3 pt-1">
        <span className="text-sm font-medium text-neutral-100">{def.label}</span>
        {def.isFeedback && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="nodrag text-neutral-400 hover:text-fuchsia-300"
            title="Reset this feedback loop"
            onClick={() => engine.resetFeedback(id)}
          >
            <RotateCcw className="size-3" />
          </Button>
        )}
      </div>

      {def.category !== 'output' && (
        <div className="px-3">
          <canvas
            ref={thumbRef}
            width={200}
            height={100}
            className="h-32 w-full rounded-md bg-black object-cover"
            style={{ transform: 'scaleY(-1)' }}
          />
        </div>
      )}

      {def.sourceKind === 'image' && (
        <div className="px-3 pt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageFile(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            size="xs"
            className="nodrag w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose image…
          </Button>
        </div>
      )}

      {def.params.length > 0 && (
        <div className="flex flex-col gap-1.5 px-3 pt-2 pb-1">
          {def.params.map((param) => (
            <ParamControl
              key={param.key}
              param={param}
              value={data.params[param.key] ?? param.default}
              onChange={(value) => handleParamChange(param.key, value)}
            />
          ))}
        </div>
      )}

      <div className="pb-2" />

      {def.inputs.map((input, index) => (
        <Handle
          key={input.id}
          type="target"
          id={input.id}
          position={Position.Left}
          style={{ top: `${((index + 1) / (def.inputs.length + 1)) * 100}%` }}
          className="!h-2.5 !w-2.5 !border-neutral-400 !bg-neutral-800"
        />
      ))}

      {def.hasOutput && (
        <Handle
          type="source"
          id="out"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-fuchsia-400 !bg-neutral-800"
        />
      )}
    </Card>
  );
}
