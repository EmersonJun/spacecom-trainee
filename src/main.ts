import * as fs from "fs";
import * as path from "path";
import { gruposDoDataset } from "./parser";
import { detectarEncontrosNoGrupo } from "./detector";
import { Encontro } from "./types";

const DATA_DIR = path.join(__dirname, "..", "data");
const OUTPUT_DIR = path.join(__dirname, "..", "output");

function chaveEncontro(e: Encontro): string {
  return `${e.tipo}|${e.monitoradosEncontro[0]}-${e.monitoradosEncontro[1]}|${e.timestamp}`;
}

function validarContraGabarito(datasetPath: string, encontrados: Encontro[]): void {
  const match = path.basename(datasetPath).match(/dataset(\d+)\.txt$/);
  if (!match) return;

  const gabaritoPath = path.join(DATA_DIR, `respostas${match[1]}.json`);
  if (!fs.existsSync(gabaritoPath)) return;

  const esperados: Encontro[] = JSON.parse(fs.readFileSync(gabaritoPath, "utf-8"));

  const setEsperado = new Set(esperados.map(chaveEncontro));
  const setEncontrado = new Set(encontrados.map(chaveEncontro));

  let corretos = 0;
  for (const chave of setEncontrado) {
    if (setEsperado.has(chave)) corretos++;
  }
  const incorretos = setEncontrado.size - corretos;
  const faltando = esperados.length - corretos;

  console.log(
    `   [validação] esperados=${esperados.length} corretos=${corretos} falsosPositivos=${incorretos} faltando=${faltando} score=${corretos - incorretos}`
  );
}

async function processarDataset(caminhoArquivo: string): Promise<void> {
  const nomeArquivo = path.basename(caminhoArquivo);
  const inicio = process.hrtime.bigint();

  const encontros: Encontro[] = [];
  for await (const grupo of gruposDoDataset(caminhoArquivo)) {
    encontros.push(...detectarEncontrosNoGrupo(grupo));
  }

  const fim = process.hrtime.bigint();
  const duracaoMs = Number(fim - inicio) / 1_000_000;

  const nomeSaida = nomeArquivo.replace(/dataset(\d+)\.txt$/, "resultado-dataset$1.json");
  const caminhoSaida = path.join(OUTPUT_DIR, nomeSaida);
  fs.writeFileSync(caminhoSaida, JSON.stringify(encontros, null, 2), "utf-8");

  console.log(
    `✔ ${nomeArquivo}: ${encontros.length} encontros detectados em ${duracaoMs.toFixed(2)}ms -> ${nomeSaida}`
  );
  validarContraGabarito(caminhoArquivo, encontros);
}

async function main(): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Pasta de dados não encontrada: ${DATA_DIR}`);
    console.error(`Coloque os arquivos dataset1.txt ... dataset7.txt dentro de ./data`);
    process.exit(1);
  }

  const arquivos = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^dataset\d+\.txt$/.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/\d+/)![0]);
      const nb = Number(b.match(/\d+/)![0]);
      return na - nb;
    });

  if (arquivos.length === 0) {
    console.error(`Nenhum arquivo dataset*.txt encontrado em ${DATA_DIR}`);
    process.exit(1);
  }

  for (const arquivo of arquivos) {
    await processarDataset(path.join(DATA_DIR, arquivo));
  }
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
