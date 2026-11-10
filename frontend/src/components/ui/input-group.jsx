import { cn } from 'cn';
import { Button } from '@/components/ui/button';

function InputGroup({ className, ...props }) {
  return <div role="group" data-slot="input-group" className={cn('input-group', className)} {...props} />;
}
function InputGroupTextarea({ className, ...props }) {
  return <textarea data-slot="input-group-control" className={cn('input-group-textarea', className)} {...props} />;
}
function InputGroupAddon({ align = 'block-end', className, ...props }) {
  return <div data-slot="input-group-addon" data-align={align} className={cn('input-group-addon', className)} {...props} />;
}
function InputGroupButton({ className, size = 'icon', ...props }) {
  return <Button size={size} className={cn('input-group-button', className)} {...props} />;
}
export { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupButton };
