import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // UFs
  const ufs = [
    { codigo: 'AC', nome: 'Acre' }, { codigo: 'AL', nome: 'Alagoas' },
    { codigo: 'AP', nome: 'Amapá' }, { codigo: 'AM', nome: 'Amazonas' },
    { codigo: 'BA', nome: 'Bahia' }, { codigo: 'CE', nome: 'Ceará' },
    { codigo: 'DF', nome: 'Distrito Federal' }, { codigo: 'ES', nome: 'Espírito Santo' },
    { codigo: 'GO', nome: 'Goiás' }, { codigo: 'MA', nome: 'Maranhão' },
    { codigo: 'MT', nome: 'Mato Grosso' }, { codigo: 'MS', nome: 'Mato Grosso do Sul' },
    { codigo: 'MG', nome: 'Minas Gerais' }, { codigo: 'PA', nome: 'Pará' },
    { codigo: 'PB', nome: 'Paraíba' }, { codigo: 'PR', nome: 'Paraná' },
    { codigo: 'PE', nome: 'Pernambuco' }, { codigo: 'PI', nome: 'Piauí' },
    { codigo: 'RJ', nome: 'Rio de Janeiro' }, { codigo: 'RN', nome: 'Rio Grande do Norte' },
    { codigo: 'RS', nome: 'Rio Grande do Sul' }, { codigo: 'RO', nome: 'Rondônia' },
    { codigo: 'RR', nome: 'Roraima' }, { codigo: 'SC', nome: 'Santa Catarina' },
    { codigo: 'SP', nome: 'São Paulo' }, { codigo: 'SE', nome: 'Sergipe' },
    { codigo: 'TO', nome: 'Tocantins' },
  ]

  for (const uf of ufs) {
    await prisma.uF.upsert({ where: { codigo: uf.codigo }, update: {}, create: uf })
  }
  console.log('✅ UFs criadas')

  // Métodos de Transferência
  const metodos = [
    'Transferência Padrão', 'DOC', 'TED', 'Pix', 'Cheque',
    'Espécie', 'Boleto', 'Débito Automático em Conta',
    'Cartão de Crédito', 'Cartão de Débito',
  ]
  for (const nome of metodos) {
    await prisma.metodoTransferencia.upsert({
      where: { id: nome.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: { id: nome.toLowerCase().replace(/\s+/g, '-'), nome },
    })
  }
  console.log('✅ Métodos de transferência criados')

  // Condições de Receita
  const condicoes = ['Verba Empenhada', 'Fundo Perdido', 'Contrapartida', 'Convênio', 'Subvenção']
  for (const nome of condicoes) {
    await prisma.condicaoReceita.create({ data: { nome } }).catch(() => {})
  }
  console.log('✅ Condições de receita criadas')

  // Cargos
  const cargos = ['Presidente', 'Diretoria', 'Gerência', 'Coordenadoria', 'Docente', 'Administrativo', 'Operador']
  for (const nome of cargos) {
    await prisma.cargo.create({ data: { nome } }).catch(() => {})
  }

  // Funções
  const funcoes = ['Administrador', 'Secretário(a)', 'Auxiliar de Serviços', 'Professor', 'Bibliotecário', 'Monitor', 'Zelador']
  for (const nome of funcoes) {
    await prisma.funcaoEmprego.create({ data: { nome } }).catch(() => {})
  }
  console.log('✅ Cargos e Funções criados')

  // Cursos e Treinamentos
  const cursos = ['Inglês', 'Espanhol', 'Jiu-Jitsu', 'Artesanato em Palha', 'Pintura', 'Crochê']
  for (const nome of cursos) {
    await prisma.cursoTreinamento.create({ data: { nome } }).catch(() => {})
  }

  // Produtos
  const produtos = ['Camisa', 'Livro', 'Brinde', 'Apostila', 'Boné']
  for (const nome of produtos) {
    await prisma.produto.create({ data: { nome } }).catch(() => {})
  }

  // Serviços
  const servicos = ['Consultoria', 'Mentoria', 'Acompanhamento', 'Palestra']
  for (const nome of servicos) {
    await prisma.servico.create({ data: { nome } }).catch(() => {})
  }
  console.log('✅ Cursos, Produtos e Serviços criados')

  // Tipos de Imóvel
  const tiposImovel = ['Sala comercial', 'Andar', 'Casa', 'Apartamento', 'Lote', 'Galpão', 'Quadra']
  for (const nome of tiposImovel) {
    await prisma.tipoImovel.create({ data: { nome } }).catch(() => {})
  }

  // Locado Para
  const locadoPara = ['Sede da Associação', 'Filial da Associação', 'Depósitos', 'Escritórios Auxiliares']
  for (const nome of locadoPara) {
    await prisma.locadoPara.create({ data: { nome } }).catch(() => {})
  }

  // Propósitos de Locação
  const propositos = ['Expansão Física de Longo Prazo', 'Locação Temporária', 'Locação Emergencial']
  for (const nome of propositos) {
    await prisma.proposiloLocacao.create({ data: { nome } }).catch(() => {})
  }

  // Condições de Benfeitoria
  const condicoesBenf = ['Abate em aluguel', 'Não abate em aluguel', 'Negociar com Locador']
  for (const nome of condicoesBenf) {
    await prisma.condicaoBenfeitoria.create({ data: { nome } }).catch(() => {})
  }
  console.log('✅ Dados de imóveis criados')

  // Tipos de Serviço
  const tiposConsumo = ['Energia Elétrica', 'Provedor de Internet', 'Telefonia', 'Gás', 'Fornecedor de Água', 'Energia Renovável']
  for (const nome of tiposConsumo) {
    await prisma.tipoServicoConsumo.create({ data: { nome } }).catch(() => {})
  }

  const tiposDigital = ['Inteligência Artificial', 'Contabilidade Online', 'TV', 'Canva']
  for (const nome of tiposDigital) {
    await prisma.tipoServicoDigital.create({ data: { nome } }).catch(() => {})
  }

  const tiposManutencao = ['Material de Limpeza', 'Manutenção Civil', 'Manutenção Elétrica', 'Manutenção de Equipamentos', 'Manutenção Geral', 'Pintura']
  for (const nome of tiposManutencao) {
    await prisma.tipoServicoManutencao.create({ data: { nome } }).catch(() => {})
  }
  console.log('✅ Tipos de serviço criados')

  // Itens Alugados
  const itensAlugados = ['Copiadora', 'Impressora', 'Computador', 'Equipamento de Áudio & Vídeo', 'Filmagem', 'Decoração de Festas & Eventos', 'Cadeiras', 'Mesas', 'Louças e Talheres']
  for (const nome of itensAlugados) {
    await prisma.itemAlugado.create({ data: { nome } }).catch(() => {})
  }

  // Serviços Prestados
  const servicosPrestados = ['Gráfica', 'Serigrafia & Brindes', 'Confecção de Roupas', 'Serralheria', 'Marcenaria']
  for (const nome of servicosPrestados) {
    await prisma.servicoPrestado.create({ data: { nome } }).catch(() => {})
  }

  // Itens Copa e Cozinha
  const itensCopa = ['Gás de cozinha', 'Eletrodomésticos', 'Louças e Talheres', 'Utensílios', 'Outros']
  for (const nome of itensCopa) {
    await prisma.itemCopaCozinha.create({ data: { nome } }).catch(() => {})
  }
  console.log('✅ Itens de despesa criados')

  // Conta Bancária de Exemplo
  await prisma.contaBancaria.create({
    data: { tipo: 'Corrente', banco: 'Banco do Brasil', agencia: '1234-5', numeroConta: '12345-6', descricao: 'Conta principal AMO' }
  }).catch(() => {})
  console.log('✅ Conta bancária de exemplo criada')

  console.log('\n🎉 Seed concluído com sucesso!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
