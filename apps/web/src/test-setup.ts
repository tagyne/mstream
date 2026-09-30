import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// jsdom does not implement PointerEvent, which Base UI uses for checkbox clicks.
if (!window.PointerEvent) {
  window.PointerEvent = MouseEvent as typeof PointerEvent;
}

afterEach(cleanup);
