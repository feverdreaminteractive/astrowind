import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ParamDef } from '../registry/nodeRegistry';

interface ParamControlProps {
  param: ParamDef;
  value: number | string;
  onChange: (value: number | string) => void;
}

// `nodrag nowheel` is load-bearing: without it, dragging this slider drags
// the whole React Flow node, and scrolling over it zooms the canvas instead
// of nothing happening.
export default function ParamControl({ param, value, onChange }: ParamControlProps) {
  if (param.type === 'select') {
    return (
      <div className="nodrag nowheel flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{param.label}</span>
        <Select value={String(value)} onValueChange={(v) => onChange(v as string)}>
          <SelectTrigger size="sm" className="h-6 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {param.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  return (
    <div className="nodrag nowheel flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-muted-foreground">{param.label}</span>
      <Slider
        className="flex-1"
        value={[numericValue]}
        min={param.min ?? 0}
        max={param.max ?? 1}
        step={param.step ?? 0.01}
        onValueChange={(vals) => onChange(Array.isArray(vals) ? vals[0] : vals)}
      />
      <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
        {numericValue.toFixed(param.step && param.step >= 1 ? 0 : 2)}
      </span>
    </div>
  );
}
