export interface Posicionamento {
  idMonitorado: number;
  faccaoMonitorado: string | null; 
  timestamp: string; 
  latitude: number;
  longitude: number;
  medidaProtetiva: boolean;
  idsRestricaoMedida: Set<number>; 
}

export type TipoEncontro = "generico" | "faccao" | "protetiva";

export interface Encontro {
  tipo: TipoEncontro;
  monitoradosEncontro: [number, number];
  timestamp: string;
  posicoes: Record<string, { lat: number; lon: number }>;
  distanciaMetros: number;
}
