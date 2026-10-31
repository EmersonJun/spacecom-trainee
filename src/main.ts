import * as fs from "fs";
import * as path from "path";
import { lerDataset, agruparPorTimestamp } from "./parser";
import { detectarEncontros } from "./detector";

const caminho = path.join(__dirname, "..", "data", "dataset1.txt");
const posicoes = lerDataset(caminho);
const grupos = agruparPorTimestamp(posicoes);
const encontros = detectarEncontros(grupos);

fs.writeFileSync(
  path.join(__dirname, "..", "output", "resultado.json"),
  JSON.stringify(encontros, null, 2)
);

console.log(`${encontros.length} encontros encontrados`);
