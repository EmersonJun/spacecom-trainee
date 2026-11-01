import * as fs from "fs";
import * as readline from "readline";
import { Posicionamento } from "./types";

function parseLinha(linha: string): Posicionamento | null {
  const campos = linha.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
  if (campos.length < 7) return null;

  const [idStr, faccao, timestamp, latStr, lonStr, medidaStr, idsRestricaoStr] = campos;

  const idMonitorado = Number(idStr);
  const latitude = Number(latStr);
  const longitude = Number(lonStr);
  if (Number.isNaN(idMonitorado) || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return {
    idMonitorado,
    faccaoMonitorado: faccao.length > 0 ? faccao : null,
    timestamp,
    latitude,
    longitude,
    medidaProtetiva: medidaStr.toLowerCase() === "true",
    idsRestricaoMedida: idsRestricaoStr.length > 0 ? idsRestricaoStr.split(",").map((s) => s.trim()) : [],
  };
}

export async function* gruposDoDataset(caminho: string): AsyncGenerator<Posicionamento[]> {
  const stream = fs.createReadStream(caminho, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let bufferTimestamp: string | null = null;
  let buffer: Posicionamento[] = [];
  let primeiraLinha = true;
  let linhasInvalidas = 0;

  for await (const linhaBruta of rl) {
    if (primeiraLinha) {
      primeiraLinha = false;
      continue;
    }

    const linha = linhaBruta.trim();
    if (!linha) continue;

    const pos = parseLinha(linha);
    if (!pos) {
      linhasInvalidas++;
      continue;
    }

    if (bufferTimestamp === null) {
      bufferTimestamp = pos.timestamp;
      buffer = [pos];
    } else if (pos.timestamp === bufferTimestamp) {
      buffer.push(pos);
    } else {
      yield buffer;
      bufferTimestamp = pos.timestamp;
      buffer = [pos];
    }
  }

  if (buffer.length > 0) yield buffer;
  if (linhasInvalidas > 0) {
    console.warn(`  (${linhasInvalidas} linhas invalidas ignoradas em ${caminho})`);
  }
}
