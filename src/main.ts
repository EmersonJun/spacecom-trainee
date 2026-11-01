import * as fs from "fs";
import * as path from "path";
import { lerDataset } from "./parser";
import { detectarEncontros } from "./detector";

const DATA_DIR = path.join(__dirname, "..", "data");
const OUTPUT_DIR = path.join(__dirname, "..", "output");

function processar(nomeArquivo: string): void {
  const caminho = path.join(DATA_DIR, nomeArquivo);
  console.time(`  ${nomeArquivo}`);

  const grupos = lerDataset(caminho);
  const encontros = detectarEncontros(grupos);

  console.timeEnd(`  ${nomeArquivo}`);

  const nomeSaida = nomeArquivo.replace(".txt", ".json");
  fs.writeFileSync(path.join(OUTPUT_DIR, nomeSaida), JSON.stringify(encontros, null, 2));
  console.log(`  -> ${encontros.length} encontros em ${nomeSaida}`);
}

function main(): void {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const arquivos = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith("dataset") && f.endsWith(".txt"));
  if (arquivos.length === 0) {
    console.error("nenhum dataset encontrado em data/");
    process.exit(1);
  }

  for (const arquivo of arquivos) {
    processar(arquivo);
  }
}

main();
