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
  cliente_id: string;
  cliente_nome?: string;
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
