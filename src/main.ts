import * as fs from "fs";
import * as path from "path";
import { gruposDoDataset } from "./parser";
import { detectarEncontrosNoGrupo } from "./detector";
import { Encontro } from "./types";

const DATA_DIR = path.join(__dirname, "..", "data");
const OUTPUT_DIR = path.join(__dirname, "..", "output");

function chave(e: Encontro): string {
  return `${e.tipo}|${e.monitoradosEncontro[0]}-${e.monitoradosEncontro[1]}|${e.timestamp}`;
}

function validar(nomeArquivo: string, encontrados: Encontro[]): void {
  const match = nomeArquivo.match(/dataset(\d+)\.txt$/);
  if (!match) return;

  const gabaritoPath = path.join(DATA_DIR, `respostas${match[1]}.json`);
  if (!fs.existsSync(gabaritoPath)) return;

  const esperados: Encontro[] = JSON.parse(fs.readFileSync(gabaritoPath, "utf-8"));
  const setEsperado = new Set(esperados.map(chave));
  const setEncontrado = new Set(encontrados.map(chave));

  let corretos = 0;
  for (const c of setEncontrado) if (setEsperado.has(c)) corretos++;
  const incorretos = setEncontrado.size - corretos;

  console.log(`  [validacao] esperados=${esperados.length} corretos=${corretos} falsosPositivos=${incorretos} score=${corretos - incorretos}`);
}

async function processar(nomeArquivo: string): Promise<void> {
  const caminho = path.join(DATA_DIR, nomeArquivo);
  const inicio = process.hrtime.bigint();

  const encontros: Encontro[] = [];
  for await (const grupo of gruposDoDataset(caminho)) {
    encontros.push(...detectarEncontrosNoGrupo(grupo));
  }

  const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1e6;

  const nomeSaida = nomeArquivo.replace(".txt", ".json");
  fs.writeFileSync(path.join(OUTPUT_DIR, nomeSaida), JSON.stringify(encontros, null, 2));

  console.log(`✔ ${nomeArquivo}: ${encontros.length} encontros em ${duracaoMs.toFixed(2)}ms -> ${nomeSaida}`);
  validar(nomeArquivo, encontros);
}

async function main(): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const arquivos = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^dataset\d+\.txt$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

  if (arquivos.length === 0) {
    console.error("nenhum dataset encontrado em data/");
    process.exit(1);
  }

  for (const arquivo of arquivos) {
    await processar(arquivo);
  }
}

main();
