export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
};

export type Veiculo = {
  id: string;
  cliente_id: string | null;
  cliente_nome?: string | null;
  placa: string;
  marca: string | null;
  modelo: string;
  ano: number | null;
  cor: string | null;
  quilometragem: number | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
};

export type Servico = {
  id: string;
  veiculo_id: string;
  data: string;
  quilometragem: number | null;
  descricao: string;
  valor: number;
  observacoes: string | null;
  criado_em: string;
};

export const OS_STATUS = [
  "aguardando_avaliacao",
  "orcamento_enviado",
  "aprovado",
  "em_execucao",
  "finalizado",
  "entregue",
  "cancelado",
] as const;

export type OsStatus = (typeof OS_STATUS)[number];

export const OS_STATUS_LABEL: Record<OsStatus, string> = {
  aguardando_avaliacao: "Aguardando avaliação",
  orcamento_enviado: "Orçamento enviado",
  aprovado: "Aprovado",
  em_execucao: "Em execução",
  finalizado: "Finalizado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export type OsItemTipo = "servico" | "peca";

export type OsItem = {
  id: string;
  os_id: string;
  tipo: OsItemTipo;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  peca_id: string | null;
};

export type OrdemServico = {
  id: string;
  numero: number;
  veiculo_id: string;
  status: OsStatus;
  data_entrada: string;
  data_prevista: string | null;
  data_conclusao: string | null;
  quilometragem: number | null;
  observacoes: string | null;
  valor_total: number;
  criado_em: string;
  // preenchidos nas listagens (JOIN)
  placa?: string;
  modelo?: string;
  cliente_nome?: string | null;
};

export type OrdemServicoDetalhe = OrdemServico & {
  marca: string | null;
  cliente_id: string | null;
  cliente_telefone: string | null;
  itens: OsItem[];
};
