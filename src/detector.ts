import { distanciaHaversine } from "./haversine";
import { Encontro, Posicionamento, TipoEncontro } from "./types";

const LIMITE_METROS = 20; 
const METROS_POR_GRAU_LAT = 111_320; 

function classificarEncontro(a: Posicionamento, b: Posicionamento): TipoEncontro {
  const aEhVitimaDeB = a.medidaProtetiva && a.idsRestricaoMedida.has(b.idMonitorado);
  const bEhVitimaDeA = b.medidaProtetiva && b.idsRestricaoMedida.has(a.idMonitorado);
  if (aEhVitimaDeB || bEhVitimaDeA) return "protetiva";

  if (
    a.faccaoMonitorado !== null &&
    b.faccaoMonitorado !== null &&
    a.faccaoMonitorado === b.faccaoMonitorado
  ) {
    return "faccao";
  }

  return "generico";
}

function metrosPorGrauLongitude(latitudeGraus: number): number {
  return METROS_POR_GRAU_LAT * Math.cos((latitudeGraus * Math.PI) / 180);
}

const CELL_LAT_GRAUS = LIMITE_METROS / METROS_POR_GRAU_LAT;

function indiceLat(lat: number): number {
  return Math.floor(lat / CELL_LAT_GRAUS);
}

function indiceLon(lat: number, lon: number): number {
  const cellLonGraus = LIMITE_METROS / metrosPorGrauLongitude(lat);
  return Math.floor(lon / cellLonGraus);
}

function montarEncontro(a: Posicionamento, b: Posicionamento, distancia: number): Encontro {
  const tipo = classificarEncontro(a, b);
  const [menor, maior] = a.idMonitorado < b.idMonitorado ? [a, b] : [b, a];
  return {
    tipo,
    monitoradosEncontro: [menor.idMonitorado, maior.idMonitorado],
    timestamp: a.timestamp,
    posicoes: {
      [menor.idMonitorado]: { lat: menor.latitude, lon: menor.longitude },
      [maior.idMonitorado]: { lat: maior.latitude, lon: maior.longitude },
    },
    distanciaMetros: distancia,
  };
}

function detectarEncontrosNoTimestamp(posicoes: Posicionamento[]): Encontro[] {
  const encontros: Encontro[] = [];
  if (posicoes.length < 2) return encontros;

  const grid = new Map<string, Posicionamento[]>();
  for (const p of posicoes) {
    const chave = `${indiceLat(p.latitude)}:${indiceLon(p.latitude, p.longitude)}`;
    const bucket = grid.get(chave);
    if (bucket) bucket.push(p);
    else grid.set(chave, [p]);
  }

  for (const p of posicoes) {
    const li = indiceLat(p.latitude);
    const lj = indiceLon(p.latitude, p.longitude);

    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const vizinhos = grid.get(`${li + di}:${lj + dj}`);
        if (!vizinhos) continue;

        for (const q of vizinhos) {
          if (q.idMonitorado <= p.idMonitorado) continue;

          const distancia = distanciaHaversine(p.latitude, p.longitude, q.latitude, q.longitude);
          if (distancia < LIMITE_METROS) {
            encontros.push(montarEncontro(p, q, distancia));
          }
        }
      }
    }
  }

  return encontros;
}

export function detectarEncontrosNoGrupo(posicoes: Posicionamento[]): Encontro[] {
  return detectarEncontrosNoTimestamp(posicoes);
}
