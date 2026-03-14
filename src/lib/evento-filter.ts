/**
 * Filtra eventos com base no projeto selecionado.
 * Mostra: eventos vinculados ao projeto + eventos avulsos (sem projeto).
 * Se nenhum projeto selecionado ou projeto é "Receita Geral"/"Administração Geral", mostra todos.
 */
export interface EventoComProjeto {
  id: string
  nome: string
  projetoVinculadoId?: string | null
}

const SPECIAL_VALUES = ['Receita Geral', 'Receita do Evento', 'Receita do Curso', 'Receita do Produto', 'Receita do Serviço', 'Administração Geral', 'Sem Evento', '']

export function filterEventosByProjeto(
  eventos: EventoComProjeto[],
  projetoId: string | undefined | null
): EventoComProjeto[] {
  if (!projetoId || SPECIAL_VALUES.includes(projetoId)) return eventos
  return eventos.filter(e => e.projetoVinculadoId === projetoId || !e.projetoVinculadoId)
}
