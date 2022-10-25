export interface DaikinConfig {
  price: number;
  override: boolean;
  overrideUntil?: Date;
}

export interface PriceRequest {
  price: number;
}

export interface FanRequest {
  fan: "AUTO" | "SILENT";
}

export interface TemperatureRequest {
  temp: number;
}

export interface OverrideRequest {
  power: boolean;
  hours: number;
}

export interface ModeRequest {
  mode: "COLD" | "HEAT";
}
