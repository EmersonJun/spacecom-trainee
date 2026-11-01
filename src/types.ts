export interface Posicionamento {
  idMonitorado: number;
  faccaoMonitorado: string | null;
  timestamp: string;
  latitude: number;
  longitude: number;
  medidaProtetiva: boolean;
  idsRestricaoMedida: string[];
}

export interface Encontro {
  tipo: "generico" | "faccao" | "protetiva";
  monitoradosEncontro: [number, number];
  timestamp: string;
  posicoes: Record<string, { lat: number; lon: number }>;
  distanciaMetros: number;
}
