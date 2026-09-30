import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import type { ComponentProps } from 'react';

type CheckboxProps = ComponentProps<typeof BaseCheckbox.Root>;

export function Checkbox({ className = '', ...props }: CheckboxProps) {
  return (
    <BaseCheckbox.Root className={`checkbox ${className}`.trim()} {...props}>
      <BaseCheckbox.Indicator className="checkbox-indicator" aria-hidden="true">
        ✓
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
