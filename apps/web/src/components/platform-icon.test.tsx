import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import twitchIcon from '../assets/icons/twitch.svg';
import kickIcon from '../assets/icons/kick.svg';
import { PlatformIcon } from './platform-icon';

describe('PlatformIcon', () => {
  it('maps each platform to its supplied decorative SVG', () => {
    const { container } = render(
      <>
        <PlatformIcon platform="twitch" />
        <PlatformIcon platform="kick" />
      </>,
    );
    const icons = Array.from(container.querySelectorAll('img'));

    expect(icons).toHaveLength(2);
    expect(icons[0]).toHaveClass('platform-icon-twitch');
    expect(icons[0]?.getAttribute('src')).toBe(twitchIcon);
    expect(icons[1]).toHaveClass('platform-icon-kick');
    expect(icons[1]?.getAttribute('src')).toBe(kickIcon);
    for (const icon of icons) {
      expect(icon).toHaveAttribute('alt', '');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
