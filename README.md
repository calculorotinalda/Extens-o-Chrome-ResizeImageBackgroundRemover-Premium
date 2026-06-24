# Smart Image Editor & BG Remover 📸✨

Uma extensão premium para navegadores que permite redimensionar imagens, remover fundos por IA e gerar planos de fundo dinâmicos personalizados. O sistema conta com uma extensão de cliente (Chrome Extension) e um servidor de backend para autenticação de chaves de licença (SaaS).

---

## 📋 Tabela Comparativa de Planos

| Funcionalidade / Funcionalidades | Plano Free (Gratuito) | Plano Premium | Plano Ultimate (Ilimitado) |
| :--- | :---: | :---: | :---: |
| **Redimensionador de Imagens** | ✅ Ilimitado | ✅ Ilimitado | ✅ Ilimitado |
| **Predefinições de Redes Sociais** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Ajuste de Formato & Qualidade** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Removedor de Fundo (AI)** | ❌ Bloqueado | ✅ Ilimitado | ✅ Ilimitado |
| **Substituição de Fundo (Templates)**| ❌ Bloqueado | ✅ Ilimitado (Templates Padrão) | ✅ Ilimitado (Todos os Templates) |
| **Ajustes de Brilho, Contraste e Desfoque**| ❌ Bloqueado | ✅ Sim | ✅ Sim |
| **Estúdio de Criação de Fundos por IA**| ❌ Bloqueado | ❌ Bloqueado | ✅ Unlocked (Gerações Ilimitadas) |
| **Processamento em Lote (Batch Queue)** | ❌ Bloqueado | ❌ Bloqueado | ✅ Unlocked (Até 100 imagens/vez em ZIP) |
| **Suporte & Licença SaaS** | Não necessita chave | Chave Premium | Chave Ultimate |

---

## 🔍 Detalhes de Cada Modalidade de Versão

### 1. 🆓 Plano Free (Gratuito)
O plano padrão disponível imediatamente após a instalação da extensão, sem necessidade de ativação de chaves. Ideal para tarefas básicas e rápidas de edição de imagens locais.

* **Descrição**: Acesso total às ferramentas básicas de redimensionamento e exportação rápida no navegador.
* **Funcionalidades Incluídas**:
  * **Image Resizer (Redimensionador)**: Arraste e solte imagens para alterar dimensões.
  * **Predefinições de Tamanho (Presets)**: Configuração rápida para dimensões de plataformas populares como:
    * Instagram Post (1080x1080)
    * Instagram Story (1080x1920)
    * Facebook Cover (851x315)
    * LinkedIn Banner (1584x396)
    * E-commerce/Marketplace (800x800)
    * Website Banner (1920x1080)
  * **Ajustes Personalizados**: Entrada manual de largura (`width`) e altura (`height`).
  * **Seleção de Formato e Qualidade**: Suporte para conversão entre múltiplos formatos de imagem (PNG, JPEG, WebP) com ajuste preciso da qualidade de compressão (0-100%).
  * **Histórico Local**: Acompanhamento das últimas edições feitas no painel do Dashboard.
* **Limitações**: Não possui acesso às ferramentas de inteligência artificial ou processamento em lote.

---

### 2. 💎 Plano Premium
O primeiro nível pago, ativado por meio de uma chave de licença válida (`PREM-xxxx`). Focado no isolamento de objetos e montagem profissional de fotos de produtos.

* **Descrição**: Desbloqueia as ferramentas inteligentes de segmentação de imagem e composições em estúdio fotográfico virtual.
* **Funcionalidades Incluídas**:
  * **Tudo o que está incluído no Plano Free**.
  * **Smart Background Remover (Removedor Inteligente de Fundo)**:
    * Segmentação automática de objetos e pessoas em primeiro plano utilizando IA.
    * Slider interativo de comparação do tipo "Antes/Depois" para inspecionar o recorte.
    * Exportação imediata do recorte transparente em formato PNG de alta definição.
  * **Background Replacer (Substituidor de Fundo)**:
    * Biblioteca com 8 templates de cenários profissionais prontos (ex: *Luxury Marble*, *Dark Studio*, *Rustic Store*, *Tech Neon*, *Luxury Gold*, *Sunlit Forest*, *Clean White*, *Cosmetic Pink*).
    * Ajustes manuais de iluminação para integrar o produto perfeitamente ao fundo: **Brilho**, **Contraste** e **Desfoque (Blur)** do fundo.
* **Limitações**: O estúdio de geração por texto IA e o processamento de imagens em massa (lote) continuam indisponíveis.

---

### 3. 👑 Plano Ultimate
A versão mais completa da ferramenta, voltada para profissionais de e-commerce, designers e agências de marketing que precisam de alta produtividade e personalização máxima por inteligência artificial.

* **Descrição**: Desbloqueia a totalidade dos recursos da extensão, incluindo geração de imagens generativas e automação em lote.
* **Funcionalidades Incluídas**:
  * **Tudo o que está incluído nos Planos Free e Premium**.
  * **AI Background Studio (Gerador de Fundos por IA)**:
    * Geração de fundos únicos através de descrições textuais (prompts).
    * Estilos artísticos pré-configurados: *Minimalista*, *Escritório*, *Luxo/Mármore*, *Natureza/Musgo*, *Loja Rústica* e *Tecnologia/Cyberpunk*.
    * Geração instantânea de cenários hiper-realistas integrados.
  * **Batch Queue Processor (Processador em Lote)**:
    * Upload simultâneo de até 100 imagens de uma só vez.
    * Execução em lote de tarefas comuns (redimensionar ou remover fundos em massa).
    * Compactação automática e download de todas as imagens processadas em formato `.ZIP`.
* **Limitações**: Nenhuma. Todos os recursos visuais, locais e integrados com a nuvem estão 100% desbloqueados.

---

## 🔑 Sistema de Licenciamento & Integração SaaS

A extensão se conecta com um backend central para validar chaves de acesso. 

1. **Ativação**: A chave de licença é inserida no painel **Licensing & Activation** (ou durante a tela inicial de *Onboarding*).
2. **Validação**: A extensão faz uma requisição segura `POST /api/license/verify` para o servidor backend.
3. **Persistência**: Ao confirmar a validade, a chave e os metadados do plano são guardados localmente usando `chrome.storage.local` para manter a extensão ativada sem necessidade de reintroduzir a chave.
# Extens-o-Chrome-ResizeImageBackgroundRemover-Premium
