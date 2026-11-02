import * as fs from "fs";
import * as readline from "readline";
import { Posicionamento } from "./types";

function limparCampo(campo: string): string {
  const v = campo.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1);
  }
  return v;
}

function parseLinha(linha: string): Posicionamento | null {
  if (!linha || linha.trim().length === 0) return null;

  const campos = linha.split(";").map(limparCampo);
  if (campos.length < 7) return null;

  const [
    idMonitoradoStr,
    faccaoStr,
    timestamp,
    latStr,
    lonStr,
    medidaProtetivaStr,
    idsRestricaoStr,
  ] = campos;

  const idsRestricaoMedida = new Set<number>();
  if (idsRestricaoStr && idsRestricaoStr.length > 0) {
    for (const parte of idsRestricaoStr.split(",")) {
      const idNum = Number(parte.trim());
      if (!Number.isNaN(idNum)) idsRestricaoMedida.add(idNum);
    }
  }

  return {
    idMonitorado: Number(idMonitoradoStr),
    faccaoMonitorado: faccaoStr.length > 0 ? faccaoStr : null,
    timestamp,
    latitude: Number(latStr),
    longitude: Number(lonStr),
    medidaProtetiva: medidaProtetivaStr.trim().toLowerCase() === "true",
    idsRestricaoMedida,
  };
}

export async function* gruposDoDataset(
  caminhoArquivo: string
): AsyncGenerator<Posicionamento[], void, unknown> {
  const stream = fs.createReadStream(caminhoArquivo, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const timestampsJaFechados = new Set<string>();
  let bufferTimestamp: string | null = null;
  let buffer: Posicionamento[] = [];
  let primeiraLinha = true;

  for await (const linhaBruta of rl) {
    if (primeiraLinha) {
      primeiraLinha = false;
      continue; 
    }

    const pos = parseLinha(linhaBruta);
    if (!pos) continue;

    if (bufferTimestamp === null) {
      bufferTimestamp = pos.timestamp;
      buffer = [pos];
    } else if (pos.timestamp === bufferTimestamp) {
      buffer.push(pos);
    } else {
      if (timestampsJaFechados.has(pos.timestamp)) {
        console.warn(
          `[aviso] timestamp "${pos.timestamp}" reapareceu fora de ordem após já ter sido processado; ` +
            `encontros entre este trecho e o trecho anterior do mesmo timestamp podem não ser detectados.`
        );
      }
      timestampsJaFechados.add(bufferTimestamp);
      yield buffer;
      bufferTimestamp = pos.timestamp;
      buffer = [pos];
    }
  }

  if (buffer.length > 0) yield buffer;
}
