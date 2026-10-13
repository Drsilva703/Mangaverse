# Integração da Chave Pix & Sistema de Doações no MangaVerse

Este plano detalha a integração da sua chave Pix aleatória (`4970bdb1-d6e0-4a23-9d06-365d1f89687c`) como a chave oficial padrão de apoio do MangaVerse, adicionando geração de padrão EMV (Pix Copia e Cola), QR Code escaneável por qualquer banco, botões de valores dinâmicos e controle editável direto no Painel Administrativo.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Decisões confirmadas com base nas suas preferências:
> - **Chave Pix Oficial**: A chave aleatória `4970bdb1-d6e0-4a23-9d06-365d1f89687c` será a chave padrão do site e poderá ser alterada a qualquer momento no Painel Admin.
> - **QR Code e Pix Copia e Cola**: O modal de apoio exibirá um QR Code escaneável de alta fidelidade e botões dedicados para "Copiar Chave Pix" e "Copiar Pix Copia e Cola" (código EMV padrão Banco Central).
> - **Valores de Contribuição**: Sugestões rápidas de valores (R$ 5, R$ 10, R$ 25, R$ 50) com recálculo instantâneo do payload do QR Code e opção de valor livre.

- **Chave Registrada**: `4970bdb1-d6e0-4a23-9d06-365d1f89687c` (Chave Aleatória / EVP)
- **Nome do Recebedor Padrão no Payload**: `MangaVerse / Denilson`
- **Cidade Padrão no Payload**: `Brasil`

---

### 1. Overview & Core Concept

- **O que faz**:
  1. **Configuração da Chave no Sistema**: Atualiza a chave padrão em `storage.ts` para a sua chave `4970bdb1-d6e0-4a23-9d06-365d1f89687c`, garantindo que todas as doações feitas pelos leitores sejam direcionadas à sua conta.
  2. **Gestão no Painel Admin**: Na aba de administração (`AdminModal`), cria uma seção exclusiva "Configurações de Apoio & Pix", permitindo visualizar a chave ativa, atualizar a chave quando desejar e alterar o nome do titular sem precisar mexer no código.
  3. **Modal de Apoio Inteligente (`SupportModal`)**: Ao clicar em "Apoiar" na barra superior ou no rodapé, o leitor vê a sua chave aleatória formatada, o QR Code dinâmico do valor selecionado e opções de cópia com feedback visual instantâneo.
- **Público-Alvo**: Leitores e apoiadores da comunidade que desejam contribuir financeiramente para manter o projeto ativo e sem anúncios intrusivos.
- **Valor Principal**: Recebimento direto e sem intermediários de doações na sua conta bancária via Pix.

---

### 2. User Experience & Visual Design

#### A. Fluxos de Uso
1. **Fluxo do Leitor (Doação)**:
   - O leitor clica no botão "Apoiar" no topo da página ou no rodapé.
   - O modal abre exibindo sua chave Pix aleatória (`4970bdb1-d6e0-4a23-9d06-365d1f89687c`).
   - O leitor escolhe um valor (ex.: R$ 10). O QR Code e o código Pix Copia e Cola são atualizados automaticamente para aquele valor.
   - O leitor pode escanear o QR Code direto com a câmera do app do banco (Nubank, Itaú, Inter, etc.) ou clicar em "Copiar Chave".
   - Toast verde confirma a cópia para a área de transferência.
2. **Fluxo do Administrador (Gestão de Pix)**:
   - No Painel Admin (logado com `denilsonr703@gmail.com`), acessa a nova aba "Doações & Pix".
   - Visualiza a chave atual (`4970bdb1-d6e0-4a23-9d06-365d1f89687c`), quantidade estimada de visualizações do modal de apoio e botão para salvar nova chave ou nome do titular.
   - Pode restaurar para a chave padrão com um único clique.

#### B. Identidade Visual & Design System
- **Tema**: Fundo escuro cinematográfico (`zinc-950` / `zinc-900`), com destaque em `pink-500` (coração e apoio) e `emerald-400` (identidade do Pix e sucesso de cópia).
- **Tipografia**: Chave em fonte monoespaçada (`font-mono`) com espaçamento claro para leitura legível no celular.
- **Micro-interações**: Animação de check ao copiar, botão pulsante sutil e pré-visualização ao vivo do QR Code.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Geração de Payload BR Code (EMV) Real para Pix Copia e Cola**
  - *Abordagem*: Gerar o payload oficial do Banco Central (formato TLV - Tag-Length-Value com CRC16) para que o leitor possa usar a função "Pix Copia e Cola" de qualquer banco brasileiro, além de poder copiar a chave simples.
  - *Por que*: Muitos bancos no celular não abrem a câmera se o usuário estiver no próprio aparelho; o "Pix Copia e Cola" permite transferir em 2 toques sem digitar nada.
- **Decisão 2: Armazenamento com Fallback Sólido**
  - *Abordagem*: Salvar a chave em `DEFAULT_SETTINGS` com persistência em `localStorage` e opção de sobrescrita no Painel Admin.
  - *Por que*: Garante que a chave funcione imediatamente para novos visitantes sem depender de migração complexa de banco, e ainda dá flexibilidade total para o administrador alterar no futuro.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT UI                                  │
│  ┌─────────────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │      SupportModal       │  │   AdminModal    │  │   Navbar/Footer │  │
│  │ (QR Code, Copia e Cola, │  │ (Aba Pix/Doação,│  │ (Botão Apoiar,  │  │
│  │  Seleção de Valores)    │  │  Edição Chave)  │  │  Status VIP)    │  │
│  └────────────┬────────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────────┼────────────────────────┼────────────────────┼───────────┘
                │                        │                    │
                ▼                        ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PIX & SETTINGS SERVICE LAYER                       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ storage.ts & pixHelper.ts                                         │  │
│  │ - DEFAULT_SETTINGS.customPixKey = '4970bdb1-d6e0-4a23-9d06-...'   │  │
│  │ - generatePixPayload(pixKey, amount, merchantName, city)          │  │
│  │ - calculateCRC16(payload)                                         │  │
│  │ - getStoredSettings() / saveStoredSettings()                      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Modelos de Dados**:
  - `PixConfig`: `{ key: '4970bdb1-d6e0-4a23-9d06-365d1f89687c', type: 'random', merchantName: string, merchantCity: string }`
  - `PixPayloadResult`: `{ brCode: string, qrCodeUrl: string, keyFormatted: string }`
