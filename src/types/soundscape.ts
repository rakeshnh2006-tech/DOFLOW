export type SoundscapeId = 'rain' | 'forest' | 'cafe' | 'whiteNoise';

export interface SoundscapeTrack {
  id: SoundscapeId;
  name: string;
  description: string;
  category: string;
}

export const SOUNDSCAPE_TRACKS: SoundscapeTrack[] = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    description: 'Soothing rainfall and soft raindrops for steady, calming focus',
    category: 'Water & Rain',
  },
  {
    id: 'forest',
    name: 'Forest & Nature',
    description: 'Calm woodland breeze through trees with gentle bird & nature sounds',
    category: 'Nature & Wind',
  },
  {
    id: 'cafe',
    name: 'Cozy Café',
    description: 'Warm coffee shop background murmur and subtle ambient clatter',
    category: 'Urban & Ambience',
  },
  {
    id: 'whiteNoise',
    name: 'Focus White Noise',
    description: 'Clean, even static noise to mask distractions and deepen concentration',
    category: 'Pure Static',
  },
];

export interface SoundscapePreferences {
  enabled: boolean;
  masterVolume: number; // 0.0 to 1.0
  volumes: Record<SoundscapeId, number>; // 0.0 to 1.0
  isMuted: boolean;
  lastSelectedId: SoundscapeId | null;
}

export const DEFAULT_SOUNDSCAPE_PREFERENCES: SoundscapePreferences = {
  enabled: true,
  masterVolume: 0.8,
  volumes: {
    rain: 0.7,
    forest: 0.7,
    cafe: 0.7,
    whiteNoise: 0.6,
  },
  isMuted: false,
  lastSelectedId: 'rain',
};
