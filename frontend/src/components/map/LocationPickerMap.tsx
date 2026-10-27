import { CivicMap } from './CivicMap';

interface LocationPickerMapProps {
  /** Leave empty until the citizen places a pin. */
  coordinates?: { lat: number; lng: number };
  onChangeCoordinates?: (coords: { lat: number; lng: number }) => void;
  height?: string;
  isDetecting?: boolean;
  addressLabel?: string;
  defaultZoom?: number;
}

export function LocationPickerMap({
  coordinates,
  onChangeCoordinates,
  height = '210px',
  isDetecting = false,
  addressLabel,
  defaultZoom,
}: LocationPickerMapProps) {
  return (
    <CivicMap
      mode="picker"
      coordinates={coordinates}
      onChangeCoordinates={onChangeCoordinates}
      height={height}
      isDetecting={isDetecting}
      addressLabel={addressLabel}
      defaultZoom={defaultZoom}
    />
  );
}
