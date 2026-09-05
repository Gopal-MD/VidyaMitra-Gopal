interface DarkVeilProps {
  speed?: number;
  warpAmount?: number;
}

// Import resolves without rendering — hero section has its own gradient background.
const DarkVeil = (_props: DarkVeilProps) => null;

export default DarkVeil;
