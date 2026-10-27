export const Colors = {
  background: {
    primary: '#000000',    // true OLED black
    secondary: '#111111',  // kart zemini
    elevated: '#1A1A1A',   // modal, bottom sheet
  },
  accent: {
    primary: '#00BFFF',
    glow: 'transparent',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    disabled: '#3A3A3A',
  },
  success: '#00C896',
  danger: '#FF4C4C',
  warning: '#FFB800',
  border: {
    subtle: 'transparent',  // border kaldırıldı — renk farkıyla ayrım yapılır
  },
} as const;
