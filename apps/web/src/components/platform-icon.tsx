import type { Platform } from '@mstream/contracts';
import kickIcon from '../assets/icons/kick.svg';
import twitchIcon from '../assets/icons/twitch.svg';

type PlatformIconProps = { platform: Platform };

const icons: Record<Platform, string> = {
  twitch: twitchIcon,
  kick: kickIcon,
};

export function PlatformIcon({ platform }: PlatformIconProps) {
  return (
    <img
      className={`platform-icon platform-icon-${platform}`}
      src={icons[platform]}
      alt=""
      aria-hidden="true"
    />
  );
}
