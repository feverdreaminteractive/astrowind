import { createContext, useContext } from 'react';
import type { CompositorEngine } from './CompositorEngine';

export const EngineContext = createContext<CompositorEngine | null>(null);

export function useEngine(): CompositorEngine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error('useEngine() called outside FeedbackComposer.');
  return engine;
}
