import * as fs from "fs";
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

export function lerDataset(caminho: string): Map<string, Posicionamento[]> {
  const conteudo = fs.readFileSync(caminho, "utf-8");
  const linhas = conteudo.split("\n");
  const grupos = new Map<string, Posicionamento[]>();

  let linhasInvalidas = 0;
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;

    const pos = parseLinha(linha);
    if (!pos) {
      linhasInvalidas++;
      continue;
    }

    const lista = grupos.get(pos.timestamp);
    if (lista) lista.push(pos);
    else grupos.set(pos.timestamp, [pos]);
  }

  if (linhasInvalidas > 0) {
    console.warn(`  (${linhasInvalidas} linhas invalidas ignoradas em ${caminho})`);
  }

  return grupos;
}
