# Desafio Trainee Tech Spacecom 2027 — Detecção de Encontros

Processa todos os `datasetN.txt` da pasta `data/`, calcula distância pela
fórmula de Haversine e detecta encontros (genérico, facção, protetiva).

## Rodar

```
npm install
npm run build
npm start
```

Coloque os arquivos `dataset1.txt` ... `dataset7.txt` em `data/`. Os
resultados são gravados em `output/`.

## Mudanças desde a primeira versão

- Processa todos os datasets da pasta, não só o `dataset1.txt`
- Corrigida a prioridade de classificação (medida protetiva tinha menos
  prioridade que facção por engano)
- Linhas malformadas agora são ignoradas com aviso, em vez de travar o parser
- Tempo de execução de cada dataset é medido e exibido no console

## Limitações conhecidas (próximos passos)

- O parser ainda carrega o arquivo inteiro na memória (`readFileSync`) —
  não deve aguentar os datasets maiores (6 e 7) sem estourar memória
- A detecção de encontros ainda compara todos os pares dentro de um
  timestamp (O(k²)) — pode ficar lento com muitos monitorados por timestamp
- Sem testes automatizados
- Sem validação automática contra o gabarito (`respostasN.json`)
