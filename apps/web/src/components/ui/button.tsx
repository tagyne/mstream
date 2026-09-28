import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<typeof BaseButton> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return <BaseButton className={`button button-${variant} ${className}`.trim()} {...props} />;
}
