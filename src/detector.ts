import { distancia } from "./haversine";
import { Encontro, Posicionamento } from "./types";

type TipoEncontro = "generico" | "faccao" | "protetiva";

const LIMITE_METROS = 20;


function classificar(a: Posicionamento, b: Posicionamento): TipoEncontro {
  const aEhVitimaDeB = a.medidaProtetiva && a.idsRestricaoMedida.includes(String(b.idMonitorado));
  const bEhVitimaDeA = b.medidaProtetiva && b.idsRestricaoMedida.includes(String(a.idMonitorado));
  if (aEhVitimaDeB || bEhVitimaDeA) return "protetiva";

  if (a.faccaoMonitorado && a.faccaoMonitorado === b.faccaoMonitorado) return "faccao";

  return "generico";
}

function detectarNoTimestamp(timestamp: string, posicoes: Posicionamento[]): Encontro[] {
  const encontros: Encontro[] = [];

  for (let i = 0; i < posicoes.length; i++) {
    for (let j = i + 1; j < posicoes.length; j++) {
      const a = posicoes[i];
      const b = posicoes[j];
      const d = distancia(a.latitude, a.longitude, b.latitude, b.longitude);
      if (d < LIMITE_METROS) {
        encontros.push({
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

  return encontros;
}

export function detectarEncontros(grupos: Map<string, Posicionamento[]>): Encontro[] {
  const todos: Encontro[] = [];
  for (const [timestamp, posicoes] of grupos) {
    todos.push(...detectarNoTimestamp(timestamp, posicoes));
  }
  return todos;
}
