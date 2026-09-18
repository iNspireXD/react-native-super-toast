type RichTone = {
  background: string;
  foreground: string;
  border: string;
};

export type ToastPalette = {
  backgroundPrimary: string;
  backgroundSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderSecondary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  rich: Record<'success' | 'error' | 'warning' | 'info', RichTone>;
};

const light: ToastPalette = {
  backgroundPrimary: '#ffffff',
  backgroundSecondary: '#f7f7f7',
  textPrimary: '#232020',
  textSecondary: '#3f3b3b',
  textTertiary: '#4f4a4a',
  borderSecondary: '#e6e3e3',
  success: '#3c8643',
  error: '#ff3a41',
  warning: '#e37a00',
  info: '#286efa',
  rich: {
    success: {
      background: '#ecfdf3',
      foreground: '#008a2e',
      border: '#d3fde5',
    },
    error: { background: '#fff0f0', foreground: '#e60000', border: '#ffe0e1' },
    warning: {
      background: '#fffcf0',
      foreground: '#dc7609',
      border: '#fdf5d3',
    },
    info: { background: '#f0f8ff', foreground: '#0973dc', border: '#d3e0fd' },
  },
};

const dark: ToastPalette = {
  backgroundPrimary: '#181313',
  backgroundSecondary: '#232020',
  textPrimary: '#ffffff',
  textSecondary: '#e6e3e3',
  textTertiary: '#c0bebe',
  borderSecondary: '#302b2b',
  success: '#9ed397',
  error: '#ff999d',
  warning: '#ffd089',
  info: '#b3cdff',
  rich: {
    success: {
      background: '#001f0f',
      foreground: '#59f3a6',
      border: '#003d1c',
    },
    error: { background: '#2d0607', foreground: '#ff9ea1', border: '#4d0408' },
    warning: {
      background: '#1d1f00',
      foreground: '#f3cf58',
      border: '#3d3d00',
    },
    info: { background: '#000d1f', foreground: '#5896f3', border: '#00113d' },
  },
};

export const palettes = { light, dark };
