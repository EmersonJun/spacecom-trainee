![Perímetro — Sistema de Detecção de Encontros](./banner.png)

# Desafio Trainee Tech Spacecom 2027 — Detecção de Encontros

Solução em **TypeScript / Node.js** para o desafio de detecção de encontros
entre monitorados (genérico, de facção e de medida protetiva) a partir de
dados de geolocalização.

> 📄 Documentação técnica completa, em formato ABNT (NBR 14724/NBR 6023), com
> a fundamentação teórica e as fontes de cada técnica usada no sistema:
> [`docs/documentacao-tecnica-abnt.pdf`](./docs/documentacao-tecnica-abnt.pdf)
> (ou [`.docx`](./docs/documentacao-tecnica-abnt.docx) para edição).

## Sumário

- [Como rodar](#como-rodar)
- [Datasets (não incluídos neste repositório)](#datasets-não-incluídos-neste-repositório)
- [Como o sistema funciona, passo a passo](#como-o-sistema-funciona-passo-a-passo)
- [Validação](#validação)
- [Por que esta é a abordagem escolhida](#por-que-esta-é-a-abordagem-escolhida)
- [Conformidade com os requisitos do desafio](#conformidade-com-os-requisitos-do-desafio)
- [Otimizações futuras](#otimizações-futuras)

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) 18 ou mais recente (vem com o `npm` junto).

**1. Instalar as dependências do projeto:**
```bash
npm install
```

**2. Colocar os datasets na pasta `data/`** — veja a seção
[Datasets](#datasets-não-incluídos-neste-repositório) logo abaixo, eles não
vêm junto no repositório.

**3. Compilar o TypeScript e rodar:**
```bash
npm run build
npm start
```

Isso processa, em ordem, todos os arquivos `dataset1.txt` até `dataset7.txt`
que estiverem em `data/`, e grava um `resultado-datasetN.json`
correspondente dentro de `output/` para cada um.

## Datasets (não incluídos neste repositório)

Os arquivos de dataset **não estão neste repositório** — só o código que os
processa. Dois motivos:

1. Os arquivos oficiais são fornecidos pela própria Spacecom, então não faz
   sentido redistribuir o que eles já forneceram.
2. Dois dos sete datasets (`dataset6.txt` e `dataset7.txt`) têm mais de
   400MB e 600MB, respectivamente — o GitHub recusa qualquer arquivo acima
   de 100MB, então eles **não caberiam** no repositório mesmo que
   quiséssemos incluir.

Para baixar os sete datasets e os dois gabaritos de teste (Linux/macOS/Git
Bash no Windows):

```bash
curl -o data/dataset1.txt https://bucket-projeto-trainee.s3.sa-east-1.amazonaws.com/dataset1.txt
curl -o data/dataset2.txt https://bucket-projeto-trainee.s3.sa-east-1.amazonaws.com/dataset2.txt
curl -o data/dataset3.txt https://bucket-projeto-trainee.s3.sa-east-1.amazonaws.com/dataset3.txt
curl -o data/dataset4.txt https://bucket-projeto-trainee.s3.sa-east-1.amazonaws.com/dataset4.txt
curl -o data/dataset5.txt https://bucket-projeto-trainee.s3.sa-east-1.amazonaws.com/dataset5.txt
curl -o data/dataset6.txt https://bucket-projeto-trainee.s3.sa-east-1.amazonaws.com/dataset6.txt
curl -o data/dataset7.txt https://bucket-projeto-trainee.s3.sa-east-1.amazonaws.com/dataset7.txt
curl -o data/respostas1.json https://bucket-projeto-trainee.s3.sa-east-1.amazonaws.com/respostas1.json
curl -o data/respostas2.json https://bucket-projeto-trainee.s3.sa-east-1.amazonaws.com/respostas2.json
```

`respostas1.json` e `respostas2.json` são os **gabaritos** dos dois
primeiros datasets (de teste). Se eles estiverem presentes em `data/`
quando você rodar `npm start`, o programa **valida automaticamente** o
próprio resultado contra o gabarito e mostra um placar no console — veja a
seção [Validação](#validação).

Os resultados que o algoritmo já gerou para os 7 datasets oficiais estão
versionados em [`output/`](./output), caso você queira conferir sem
precisar baixar e rodar nada.

## Como o sistema funciona, passo a passo

O código fica em `src/`, dividido em 5 arquivos pequenos, cada um com uma
única responsabilidade. A ideia de separar assim é simples: se um dia
precisar mudar *como* o sistema lê o arquivo, só mexe em `parser.ts` — o
resto nem percebe.

```
dataset.txt
     |
     v
+-------------+      agrupa por timestamp,     +--------------+
|  parser.ts  | ---  um grupo por vez (stream) >| detector.ts  |
+-------------+                                 +------+-------+
                                                        | usa
                                                        v
                                                 +--------------+
                                                 | haversine.ts |
                                                 +--------------+
     ^                                                 |
     |                                                 | encontros
+-------------+ <---------------------------------------+
|   main.ts   |  grava output/*.json, mede tempo, valida
+-------------+
```

`types.ts` não aparece no diagrama porque não faz nada sozinho — ele só
define o "formato" dos dados (`Posicionamento`, `Encontro`) que todos os
outros arquivos usam.

### 1. `parser.ts` — lê o arquivo, um pedaço de cada vez

O arquivo é lido **linha a linha** (módulo `readline` do Node, sobre um
`stream`) em vez de carregado inteiro na memória de uma vez. As posições são
entregues em grupos — um grupo por timestamp — através de um *async
generator* (`gruposDoDataset`): assim que a leitura encontra uma linha de um
timestamp diferente do grupo atual, o grupo anterior é entregue (`yield`)
para ser processado imediatamente, e então descartado da memória antes de
continuar lendo o resto do arquivo.

**Por que isso importa**: datasets grandes (os de 423MB e 638MB) não cabem
inteiros, confortavelmente, na memória padrão do Node. Com esse desenho, o
programa nunca precisa segurar mais do que os monitorados de **um único
timestamp** por vez. Em um teste sintético de 900 mil linhas (3.000
monitorados × 300 timestamps), o processamento inteiro usou ~39MB de
memória — contra um erro de `heap out of memory` que acontecia antes, numa
versão que carregava tudo de uma vez.

### 2. `haversine.ts` — calcula a distância entre dois pontos

Implementação direta da fórmula de Haversine, com o raio da Terra fixado em
6.371.000 metros (exigido pelo enunciado). Validada batendo **exatamente**
(todas as casas decimais) com os valores de `distanciaMetros` do gabarito
oficial.

### 3. `detector.ts` — encontra os pares próximos (e classifica)

Para cada timestamp, o problema é: "quais pares de monitorados estão a
menos de 20 metros um do outro?". Comparar todo mundo com todo mundo
(O(k²), onde k é quantos monitorados existem naquele timestamp) fica caro
conforme k cresce — foi exatamente isso que fazia o tempo de execução
disparar nos datasets maiores.

A solução usa uma **grade espacial** (*spatial grid*): cada monitorado é
colocado numa célula de ~20m de lado, de acordo com sua posição. Para
decidir se dois monitorados se encontraram, só é preciso olhar quem está na
mesma célula ou nas 8 células vizinhas — nunca é preciso comparar com quem
está longe, porque a distância entre células não-vizinhas já garante que
estão a mais de 20m. Isso reduz o trabalho de O(k²) para, em média, **O(k)**
por timestamp.

Depois de achar um par próximo, a função `classificarEncontro()` decide o
tipo, nessa ordem de prioridade: **protetiva > facção > genérico** (medida
protetiva é tratada como mais crítica, por isso vem primeiro quando os dois
critérios se aplicariam ao mesmo tempo — essa prioridade não está explícita
no enunciado, foi uma decisão de projeto).

### 4. `main.ts` — comanda tudo

Varre a pasta `data/`, chama o parser e o detector para cada dataset **em
sequência** (um dataset termina antes do próximo começar), mede o tempo de
execução de cada um, grava o resultado em `output/` e, se encontrar um
gabarito correspondente, valida automaticamente (próxima seção).

## Validação

Quando `respostas1.json` e/ou `respostas2.json` estão em `data/`, o
programa compara o resultado gerado com o gabarito oficial e imprime:

```
✔ dataset1.txt: N encontros detectados em X.XXms -> resultado-dataset1.json
   [validação] esperados=N corretos=N falsosPositivos=0 faltando=0 score=N
```

Isso reproduz localmente a fórmula de pontuação do desafio
(`score = soma_ec - soma_ei`), permitindo conferir a lógica **antes** de
confiar no resultado dos 5 datasets que valem nota.

No `dataset1.txt` oficial, os 4 encontros do gabarito bateram **100%**:
mesmo tipo, mesmo par, mesmo timestamp e mesma distância (até a última
casa decimal) nos 4 casos — um `generico`, um `protetiva`, um `faccao` e
outro `generico` — com zero falsos positivos.

## Por que esta é a abordagem escolhida

- **Streaming ponta a ponta** (leitura e detecção): memória limitada ao
  tamanho de um timestamp, não ao arquivo inteiro — necessário pra
  datasets grandes não estourarem o heap do Node.
- **Grade espacial em vez de O(k²)**: ganho real de desempenho em
  datasets com muitos monitorados por timestamp, sem nunca perder um par
  real (sempre checa as 9 células ao redor).
- **TypeScript com tipos explícitos** (`src/types.ts`): o contrato de dados
  fica claro, e erros de campo/tipo trocado são pegos na compilação — antes
  de rodar, não depois. Isso importa porque o critério de pontuação
  penaliza falso positivo tanto quanto recompensa acerto.
- **Módulos pequenos e isolados**: facilita tanto testar cada peça
  separadamente quanto defender a solução explicando uma parte de cada vez.
- **Processamento sequencial, de propósito**: os datasets são processados
  um de cada vez, em vez de em paralelo. Para o volume deste desafio (7
  arquivos, o maior deles processando em ~32s), isso é simples, previsível
  e fácil de defender — cada tempo de execução impresso no console é
  exatamente o tempo daquele dataset, sem nenhuma disputa por CPU com
  outro processo rodando ao mesmo tempo. Paralelizar é uma otimização
  possível (ver "Otimizações futuras"), mas não foi necessária aqui.

## Conformidade com os requisitos do desafio

| Requisito do enunciado | Como é atendido |
|---|---|
| Tecnologia: JavaScript ou TypeScript (Node.js) | TypeScript compilado para Node.js via `tsc`, sem frameworks externos. |
| Raio de 20m, "distância **menor que** 20 metros" | `distancia < LIMITE_METROS` (estritamente menor, não `<=`). |
| Fórmula de Haversine, raio da Terra 6.371.000m | Implementada em `haversine.ts`, validada contra o gabarito oficial. |
| Comparar apenas posicionamentos com o **exato mesmo timestamp** | Agrupamento por igualdade de string do timestamp — sem parsing de data. |
| Três tipos de encontro (genérico / facção / protetiva) | `classificarEncontro()`, com prioridade protetiva > facção > genérico. |
| Unicidade — cada par uma única vez por timestamp | Garantida estruturalmente (cada par só é avaliado uma vez). |
| Formato de input e output | Implementados conforme especificação literal do enunciado. |
| Eficiência (critério de desempate) | Streaming + grade espacial; tempos medidos e impressos a cada execução. |

## Otimizações futuras

O sistema já roda os 7 datasets oficiais sem estourar memória, mas ainda dá
pra acelerar mais, se o tempo de execução precisar ser menor:

- **Paralelizar entre datasets com `worker_threads`**: hoje os 7 datasets
  são processados um atrás do outro. Como cada dataset é completamente
  independente dos outros, dá pra processar vários ao mesmo tempo, um por
  núcleo de CPU disponível — numa máquina com 4+ núcleos, isso pode
  reduzir o tempo total quase na mesma proporção.
- **Parser mais rápido que `readline`**: o módulo `readline` tem uma
  sobrecarga por causa de como ele emite eventos linha a linha. Pra
  arquivos muito grandes, ler blocos maiores do arquivo manualmente (via
  `fs.read` em buffers) e quebrar as linhas "na mão" costuma ser mais
  rápido, ao custo de um código um pouco mais complexo.
- **Evitar recriar a grade do zero a cada timestamp**: hoje, a cada grupo
  processado, um novo `Map` é criado para a grade espacial. Reutilizar a
  mesma estrutura entre timestamps (limpando em vez de recriar) reduz a
  pressão sobre o coletor de lixo do V8 (garbage collector).
- **Escrever o output em streaming**: hoje o resultado de cada dataset é
  acumulado inteiro num array antes do `JSON.stringify` final. Para
  resultados muito grandes, escrever cada encontro direto num
  `fs.createWriteStream` conforme é encontrado evita manter o array de
  saída inteiro em memória também.
- **Usar `Buffer` em vez de `string` no parsing**: converter cada linha pra
  string (como o `readline` já faz) tem um custo de alocação. Trabalhar
  diretamente com os bytes do `Buffer` evita essa conversão, mas é
  consideravelmente mais complexo de implementar corretamente.

Nenhuma dessas é necessária para os 7 datasets atuais rodarem corretamente
— são o próximo nível de otimização, caso o volume de dados cresça bem além
do que o desafio prevê hoje.
