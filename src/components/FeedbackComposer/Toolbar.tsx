import { useRef } from 'react';
import { Circle, Square, Camera, Download, Upload, Link2, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ResolutionScale } from './engine/types';
import { PRESETS } from './presets';

interface ToolbarProps {
  isRecording: boolean;
  onToggleRecord: () => void;
  onScreenshot: () => void;
  onSave: () => void;
  onLoadFile: (file: File) => void;
  onLoadPreset: (presetId: string) => void;
  onCopyShareLink: () => void;
  onGlobalReset: () => void;
  resolution: ResolutionScale;
  onResolutionChange: (scale: ResolutionScale) => void;
  performMode: boolean;
  onTogglePerformMode: () => void;
}

export default function Toolbar({
  isRecording,
  onToggleRecord,
  onScreenshot,
  onSave,
  onLoadFile,
  onLoadPreset,
  onCopyShareLink,
  onGlobalReset,
  resolution,
  onResolutionChange,
  performMode,
  onTogglePerformMode,
}: ToolbarProps) {
  const loadInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950/90 p-1.5 shadow-xl backdrop-blur">
      <Button variant={isRecording ? 'destructive' : 'secondary'} size="xs" onClick={onToggleRecord} title="Record to WebM">
        {isRecording ? <Square className="size-3.5" /> : <Circle className="size-3.5" />}
        {isRecording ? 'Stop' : 'Record'}
      </Button>

      <Button variant="ghost" size="icon-xs" onClick={onScreenshot} title="Screenshot (PNG)">
        <Camera className="size-3.5" />
      </Button>

      <div className="mx-1 h-5 w-px bg-neutral-800" />

      <Button variant="ghost" size="icon-xs" onClick={onSave} title="Save patch (JSON)">
        <Download className="size-3.5" />
      </Button>

      <input
        ref={loadInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onLoadFile(file);
          e.target.value = '';
        }}
      />
      <Button variant="ghost" size="icon-xs" onClick={() => loadInputRef.current?.click()} title="Load patch (JSON)">
        <Upload className="size-3.5" />
      </Button>

      <Button variant="ghost" size="icon-xs" onClick={onCopyShareLink} title="Copy share link">
        <Link2 className="size-3.5" />
      </Button>

      <div className="mx-1 h-5 w-px bg-neutral-800" />

      <Select value="presets" onValueChange={(v) => v && v !== 'presets' && onLoadPreset(v)}>
        <SelectTrigger size="sm" className="h-7 text-xs">
          <SelectValue placeholder="Presets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="presets" disabled>
            Load a preset…
          </SelectItem>
          {PRESETS.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(resolution)} onValueChange={(v) => onResolutionChange(Number(v) as ResolutionScale)}>
        <SelectTrigger size="sm" className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0.5">0.5x</SelectItem>
          <SelectItem value="1">1x</SelectItem>
          <SelectItem value="2">2x</SelectItem>
        </SelectContent>
      </Select>

      <div className="mx-1 h-5 w-px bg-neutral-800" />

      <Button variant="ghost" size="icon-xs" onClick={onGlobalReset} title="Reset all feedback loops">
        <RotateCcw className="size-3.5" />
      </Button>

      <Button variant="ghost" size="icon-xs" onClick={onTogglePerformMode} title={performMode ? 'Exit perform mode' : 'Perform mode (fullscreen output)'}>
        {performMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
      </Button>
    </div>
  );
}
