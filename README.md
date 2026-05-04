# Balance App

Aplicativo mobile de **gestão financeira para condomínios**, desenvolvido com React Native e Expo. Permite registrar receitas e despesas, extrair lançamentos automaticamente de fotos de cadernos via IA e exportar relatórios em PDF.

## Funcionalidades

- Gerenciamento de períodos contábeis mensais
- Cadastro manual de receitas e despesas
- Extração automática de lançamentos a partir de fotos usando IA (Ollama Cloud)
- Revisão e edição dos lançamentos extraídos antes de salvar
- Resumo financeiro com totais de receita, despesa e saldo
- Exportação de relatórios por período em PDF
- Configuração de modelo de IA, URL, chave de API e prompt personalizado

## Tech Stack

- **React Native 0.81** + **Expo 54** + **TypeScript**
- **React Navigation 7** — navegação por abas e pilha nativa
- **React Native Paper** — componentes Material Design
- **Expo SQLite** — banco de dados local on-device
- **Anthropic SDK** + **Google Generative AI** + **Ollama Cloud API** — integração de IA
- **Expo Print / Expo Sharing** — geração e compartilhamento de PDF

## Pré-requisitos

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`) ou uso via `npx`
- Expo Go no dispositivo físico, ou emulador Android/iOS configurado

## Instalação e execução

```bash
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm start

# Rodar no Android
npm run android

# Rodar no iOS
npm run ios

# Rodar no navegador (web)
npm run web
```

O banco de dados SQLite (`balance.db`) é criado automaticamente no diretório de documentos do app na primeira execução. Nenhuma configuração adicional de banco de dados é necessária.

## Configuração de IA

As configurações de IA ficam na tela **Configurações** dentro do app:

| Campo | Descrição |
|---|---|
| URL do Ollama | Endpoint da API Ollama Cloud |
| Chave de API | Token de autenticação |
| Modelo | Modelo de IA (ex: `gemma3:4b`, `gemma3:12b`) |
| Prompt do sistema | Instruções personalizadas para extração de lançamentos |

Sem configuração de IA, todas as demais funcionalidades (cadastro manual, relatórios, PDF) funcionam normalmente.

## Estrutura do projeto

```
src/
├── components/       # Componentes reutilizáveis (cards, diálogos, overlays)
├── constants/        # Paleta de cores
├── db/
│   ├── database.ts   # Conexão e inicialização do SQLite
│   ├── migrations.ts # Migrações de schema (7 versões)
│   └── repositories/ # Acesso a dados (periods, transactions, photos, settings)
├── hooks/            # Hooks de estado (useDatabase, usePeriods, useTransactions, useSettings)
├── navigation/       # Configuração do React Navigation
├── screens/          # Telas do app
├── services/         # Lógica de negócio (aiService, pdfService, periodService)
├── types/            # Modelos TypeScript
└── utils/            # Formatação de moeda e datas
```

## Build para produção

O projeto usa **EAS Build** (Expo Application Services):

```bash
# Build para Android
eas build --platform android

# Build para iOS
eas build --platform ios
```

Consulte `eas.json` para os perfis de build disponíveis.

## Observações

- Interface e dados em **português brasileiro** (BRL, DD/MM/AAAA)
- Os dados ficam armazenados **localmente** no dispositivo — não há sincronização em nuvem
- Permissões necessárias: câmera e armazenamento externo (para OCR e exportação de PDF)
