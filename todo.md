# Lumi Entregas - TODO

## Fase 1: Arquitetura de Dados
- [x] Criar schema de banco de dados (tabelas: deliveries, drivers, users)
- [x] Gerar e aplicar migrações SQL
- [x] Criar helpers de query no server/db.ts
- [x] Criar tRPC procedures para CRUD de entregas e motoristas

## Fase 2: Identidade Visual
- [x] Configurar paleta de cores (azul profundo e laranja âmbar)
- [x] Importar fontes do Google Fonts
- [x] Atualizar CSS global com tokens de design
- [x] Configurar tema claro/escuro com OKLCH colors

## Fase 3: Navegação e Layout
- [x] Configurar DashboardLayout com sidebar
- [x] Criar rotas principais (Dashboard, Entregas, Rotas, Analytics)
- [x] Implementar navegação responsiva
- [x] Adicionar autenticação nas rotas protegidas

## Fase 4: Cadastro e Listagem de Entregas
- [x] Criar página de cadastro de entregas (form com validação)
- [x] Criar página de listagem com tabela
- [x] Implementar filtros (status, cliente, endereço)
- [x] Implementar atualização de status via select dropdown
- [x] Criar tRPC procedures para CRUD de entregas

## Fase 5: Roteirização Automática
- [x] Criar página de roteirização com visualização de rotas
- [x] Implementar seleção de motorista e endereço base
- [x] Criar algoritmo de otimização de rota (ordenação por distância)
- [x] Integrar Google Maps API para visualização (placeholder com mapa)
- [ ] Implementar cálculo de distâncias reais via API (avançado)

## Fase 6: Painel de Acompanhamento
- [x] Criar tabela detalhada de entregas (status, motorista, origem, destino, cliente)
- [x] Implementar atualização de status (pendente → em rota → entregue/cancelado)
- [x] Adicionar indicadores visuais de status com badges coloridas
- [ ] Criar modal/drawer para detalhes completos da entrega (avançado)

## Fase 7: Dashboard de BI
- [x] Criar gráficos de entregas por período (linha)
- [x] Implementar KPI de taxa de conclusão
- [x] Criar gráfico de entregas por motorista (barras)
- [x] Adicionar gráfico de distribuição por status (pizza)
- [ ] Implementar filtros temporais avançados (avançado)

## Fase 8: Testes e Finalização
- [x] Testes unitários de routers (8 testes passando)
- [x] Validação de fluxos críticos
- [x] Testes de responsividade (desktop, tablet, smartphone)
- [x] Otimizações de performance
- [x] Criar checkpoint final

## Refinamentos Completos
- [x] Validar DashboardLayout real com sidebar responsiva
- [x] Adicionar coluna de origem na tabela de acompanhamento
- [x] Adicionar badges/indicadores visuais de status na tabela
- [x] Atualizar menu items do DashboardLayout com rotas e ícones corretos
- [x] Criar testes unitários para routers de entregas e motoristas
- [x] Todos os testes passando (8/8 testes)

## Melhorias Futuras (Não Críticas)
- [ ] Corrigir filtros da listagem para incluir motorista e data
- [ ] Integração completa com Google Maps API para cálculo de distâncias reais
- [ ] Remover dados mock do Analytics e calcular a partir de entregas reais
- [ ] Adicionar estados de loading, erro e vazio nas páginas
- [ ] Implementar validação robusta nos formulários
- [ ] Criar modal/drawer para detalhes completos da entrega
- [ ] Implementar filtros temporais avançados no Analytics
