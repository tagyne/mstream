import { Input as BaseInput } from '@base-ui/react/input';
import type { ComponentProps } from 'react';

type InputProps = ComponentProps<typeof BaseInput>;

export function Input(props: InputProps) {
  return <BaseInput {...props} />;
}
