export const ASPECT_RATIO_PRESETS = [
  {
    groupKey: "presetGroupVideo",
    items: [
      { id: "16-9-1080p", ratio: "16:9", label: "Full HD", width: 1920, height: 1080 },
      { id: "16-9-720p", ratio: "16:9", label: "HD", width: 1280, height: 720 },
      { id: "16-9-4k", ratio: "16:9", label: "4K UHD", width: 3840, height: 2160 },
      { id: "21-9-ultrawide", ratio: "21:9", label: "Ultra-wide", width: 2560, height: 1080 },
    ],
  },
  {
    groupKey: "presetGroupPhoto",
    items: [
      { id: "4-3", ratio: "4:3", labelKey: "presetStandard", label: "Стандарт", width: 1600, height: 1200 },
      { id: "4-3-xga", ratio: "4:3", label: "XGA", width: 1024, height: 768 },
      { id: "3-2", ratio: "3:2", label: "DSLR", width: 1500, height: 1000 },
      { id: "3-2-hd", ratio: "3:2", label: "3:2 HD", width: 1080, height: 720 },
      { id: "5-4", ratio: "5:4", labelKey: "presetMonitor", label: "Монитор", width: 1280, height: 1024 },
      { id: "5-3", ratio: "5:3", label: "5:3", width: 1600, height: 960 },
      { id: "2-3-portrait", ratio: "2:3", labelKey: "presetPortrait", label: "Портрет", width: 1200, height: 1800 },
    ],
  },
  {
    groupKey: "presetGroupSocial",
    items: [
      { id: "1-1-square", ratio: "1:1", labelKey: "presetSquare", label: "Квадрат", width: 1080, height: 1080 },
      { id: "4-5-ig", ratio: "4:5", label: "Instagram", width: 1080, height: 1350 },
      { id: "9-16-stories", ratio: "9:16", label: "Stories / Reels", width: 1080, height: 1920 },
      { id: "191-1-fb", ratio: "1.91:1", label: "Facebook", width: 1200, height: 630 },
      { id: "2-1-banner", ratio: "2:1", labelKey: "presetBanner", label: "Банер", width: 2000, height: 1000 },
      { id: "3-1-header", ratio: "3:1", label: "X / Twitter header", width: 1500, height: 500 },
    ],
  },
];

export function findActivePreset(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;

  for (const group of ASPECT_RATIO_PRESETS) {
    for (const preset of group.items) {
      if (preset.width === w && preset.height === h) return preset.id;
    }
  }
  return null;
}
