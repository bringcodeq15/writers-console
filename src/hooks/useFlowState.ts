import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';

export interface FlowState {
  isInFlow: boolean;
  flowIntensity: number; // 0.0 to 1.0
  isTyping: boolean;
}

export function useFlowState(editor: Editor | null): FlowState {
  const [flowState, setFlowState] = useState<FlowState>({
    isInFlow: false,
    flowIntensity: 0,
    isTyping: false,
  });

  const lastUpdateRef = useRef<number>(0);
  const flowStartRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mouseRestoreRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const IDLE_THRESHOLD = 4000; // 4s pause resets flow
  const FLOW_ONSET = 30; // 30s to enter flow
  const FLOW_PEAK = 120; // 120s to reach full intensity

  const updateIntensity = useCallback(() => {
    if (!flowStartRef.current) {
      setFlowState((s) => (s.flowIntensity > 0 || s.isInFlow ? { ...s, isInFlow: false, flowIntensity: 0 } : s));
      return;
    }

    const elapsed = (Date.now() - flowStartRef.current) / 1000;
    if (elapsed < FLOW_ONSET) {
      setFlowState((s) => (s.isInFlow ? { ...s, isInFlow: false, flowIntensity: 0 } : s));
      return;
    }

    const intensity = Math.min(1.0, (elapsed - FLOW_ONSET) / (FLOW_PEAK - FLOW_ONSET));
    setFlowState({ isInFlow: true, flowIntensity: intensity, isTyping: true });
  }, []);

  // Handle mouse movement to temporarily break dimming
  const handleMouseMove = useCallback(() => {
    if (!flowStartRef.current) return;
    // Temporarily reduce intensity on mouse movement
    setFlowState((s) => {
      if (!s.isInFlow) return s;
      return { ...s, flowIntensity: Math.max(0, s.flowIntensity - 0.3) };
    });

    if (mouseRestoreRef.current) clearTimeout(mouseRestoreRef.current);
    mouseRestoreRef.current = setTimeout(() => {
      updateIntensity();
    }, 2000);
  }, [updateIntensity]);

  useEffect(() => {
    if (!editor) return;

    const onUpdate = () => {
      const now = Date.now();
      lastUpdateRef.current = now;

      // Reset idle timer
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        // Idle too long — break flow
        flowStartRef.current = null;
        updateIntensity();
      }, IDLE_THRESHOLD);

      // Mark typing
      setFlowState((s) => (s.isTyping ? s : { ...s, isTyping: true }));
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setFlowState((s) => (s.isTyping ? { ...s, isTyping: false } : s));
      }, 150);

      // Start flow timer if not already started
      if (!flowStartRef.current) {
        flowStartRef.current = now;
      }
    };

    editor.on('update', onUpdate);

    // Poll intensity every second
    intervalRef.current = setInterval(updateIntensity, 1000);

    // Listen for mouse movement on non-editor areas
    const sidebarEl = document.querySelector('[data-flow-target="sidebar"]');
    const titleEl = document.querySelector('[data-flow-target="title"]');
    const statusEl = document.querySelector('[data-flow-target="status"]');

    [sidebarEl, titleEl, statusEl].forEach((el) => {
      el?.addEventListener('mousemove', handleMouseMove);
    });

    return () => {
      editor.off('update', onUpdate);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mouseRestoreRef.current) clearTimeout(mouseRestoreRef.current);
      [sidebarEl, titleEl, statusEl].forEach((el) => {
        el?.removeEventListener('mousemove', handleMouseMove);
      });
    };
  }, [editor, updateIntensity, handleMouseMove]);

  return flowState;
}
