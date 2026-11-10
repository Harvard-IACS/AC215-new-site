import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
const options = [{ value: 'light', label: 'Light', Icon: Sun }, { value: 'dark', label: 'Dark', Icon: Moon }, { value: 'system', label: 'System', Icon: Monitor }];
export function ThemeControls() {
  const [preference, setPreference] = useState('system');
  useEffect(() => { setPreference(document.documentElement.dataset.themePreference || 'system'); }, []);
  function choose(values) {
    const value = values[0];
    if (!value) return;
    setPreference(value);
    window.ac215Theme.set(value);
  }
  return <ToggleGroup className="theme-switch" value={[preference]} onValueChange={choose} aria-label="Background theme" multiple={false} spacing={0}>
    {options.map(({ value, label, Icon }) => <ToggleGroupItem key={value} value={value} data-theme-value={value} aria-label={`Use ${label.toLowerCase()} theme`} title={label} type="button"><Icon data-icon="inline-start" aria-hidden="true" /><span>{label}</span></ToggleGroupItem>)}
  </ToggleGroup>;
}
