import { useEffect, useRef, useState } from 'react';
import { Collapsible } from '@base-ui/react/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from 'cn';

export function AnimatedDisclosure({ summary, children, className, open, onOpenChange, onCollapsed, defaultOpen = false, label }) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const expanded = open ?? localOpen;
  const panelRef = useRef(null), triggerRef = useRef(null), expandedRef = useRef(expanded), collapsedRef = useRef(onCollapsed);
  expandedRef.current = expanded; collapsedRef.current = onCollapsed;
  useEffect(() => {
    if (!expanded && (panelRef.current?.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches)) collapsedRef.current?.();
  }, [expanded, onCollapsed]);
  function change(next) {
    if (!next && panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
    setLocalOpen(next); onOpenChange?.(next);
  }
  return <Collapsible.Root className={cn('disclosure', className)} open={expanded} onOpenChange={change}>
    <Collapsible.Trigger ref={triggerRef} className="disclosure-trigger" aria-label={label}>{summary}<ChevronDown aria-hidden="true" /></Collapsible.Trigger>
    <Collapsible.Panel ref={panelRef} keepMounted className="disclosure-panel" aria-hidden={!expanded} inert={!expanded}
      onTransitionEnd={event => { if (event.target === panelRef.current && event.propertyName === 'grid-template-rows' && !expandedRef.current) collapsedRef.current?.(); }}>
      <div className="disclosure-clip"><div className="disclosure-content">{children}</div></div>
    </Collapsible.Panel>
  </Collapsible.Root>;
}
