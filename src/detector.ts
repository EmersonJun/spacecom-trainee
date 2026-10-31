import { distancia } from "./haversine";
import { Posicionamento } from "./types";

const LIMITE = 20;

function classificar(a: Posicionamento, b: Posicionamento): string {
  if (a.faccaoMonitorado && a.faccaoMonitorado === b.faccaoMonitorado) return "faccao";
  if (a.medidaProtetiva && a.idsRestricaoMedida.includes(String(b.idMonitorado))) return "protetiva";
  if (b.medidaProtetiva && b.idsRestricaoMedida.includes(String(a.idMonitorado))) return "protetiva";
  return "generico";
}

export function detectarEncontros(grupos: Record<string, Posicionamento[]>): any[] {
  const resultado: any[] = [];

  for (const timestamp in grupos) {
    const posicoes = grupos[timestamp];
    for (let i = 0; i < posicoes.length; i++) {
      for (let j = i + 1; j < posicoes.length; j++) {
        const a = posicoes[i];
        const b = posicoes[j];
        const d = distancia(a.latitude, a.longitude, b.latitude, b.longitude);
        if (d < LIMITE) {
          resultado.push({
            tipo: classificar(a, b),
            monitoradosEncontro: [a.idMonitorado, b.idMonitorado],
            timestamp,
            posicoes: {
              [a.idMonitorado]: { lat: a.latitude, lon: a.longitude },
              [b.idMonitorado]: { lat: b.latitude, lon: b.longitude },
            },
            distanciaMetros: d,
          });
        }
      }
    }
  }

  return resultado;
}
