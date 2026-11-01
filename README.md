# Desafio Trainee Tech Spacecom 2027 — Detecção de Encontros

Processa todos os `datasetN.txt` da pasta `data/`, calcula distância pela
fórmula de Haversine e detecta encontros (genérico, facção, protetiva).

## Rodar

```
npm install
npm run build
npm start
```

Coloque os arquivos `dataset1.txt` ... `dataset7.txt` (e, se quiser validar,
`respostas1.json`/`respostas2.json`) em `data/`. Os resultados são gravados
em `output/`.

## Mudanças desde a v2

- **Corrigido o estouro de memória nos datasets 6 e 7** (423MB e 638MB): o
  parser agora lê o arquivo em streaming (linha a linha, com `readline`) e
  processa cada timestamp assim que ele fecha, em vez de carregar o
  arquivo inteiro num `Map` antes de começar. Isso era o que causava
  `JavaScript heap out of memory` nos datasets maiores.
- Validação automática contra o gabarito (`respostasN.json`), quando
  presente: imprime quantos encontros bateram, falsos positivos e o score
  local, pra conferir a lógica antes de rodar nos datasets oficiais.
- Tempo de execução medido com `process.hrtime.bigint()`.

## Limitações conhecidas (próximos passos)

- A detecção de encontros ainda compara todos os pares dentro de um
  timestamp (O(k²)) — nos datasets 6 e 7 isso já é visivelmente mais lento
  que nos menores; o próximo passo é uma indexação espacial (grade) pra
  não precisar comparar todo mundo com todo mundo.
- Sem testes automatizados.
- Sem documentação técnica formal.
