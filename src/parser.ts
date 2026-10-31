import * as fs from "fs";
import { Posicionamento } from "./types";

export function lerDataset(caminho: string): Posicionamento[] {
  const conteudo = fs.readFileSync(caminho, "utf-8");
  const linhas = conteudo.split("\n");
  const posicoes: Posicionamento[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;

    const campos = linha.split(";").map((c) => c.replace(/"/g, ""));
    posicoes.push({
      idMonitorado: Number(campos[0]),
      faccaoMonitorado: campos[1],
      timestamp: campos[2],
      latitude: Number(campos[3]),
      longitude: Number(campos[4]),
      medidaProtetiva: campos[5] === "true",
      idsRestricaoMedida: campos[6],
    });
  }

  return posicoes;
}

export function agruparPorTimestamp(posicoes: Posicionamento[]): Record<string, Posicionamento[]> {
  const grupos: Record<string, Posicionamento[]> = {};
  for (const p of posicoes) {
    if (!grupos[p.timestamp]) grupos[p.timestamp] = [];
    grupos[p.timestamp].push(p);
  }
  return grupos;
}
