import type { Metadata } from "next";
import Link from "next/link";
import { business } from "@/config/business";
import { phoneTel } from "@/lib/site";

export const metadata: Metadata = {
  title: `Política de Privacidade | ${business.name}`,
  description: `Como a ${business.name} trata os dados pessoais de quem pede orçamento e de seus clientes, conforme a LGPD (Lei nº 13.709/2018).`,
  alternates: { canonical: "/privacidade" },
};

/** Atualize esta data sempre que o texto abaixo mudar. */
const ATUALIZADA_EM = "30 de setembro de 2026";

export default function Privacidade() {
  const tel = phoneTel();

  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <Link className="wordmark" href="/" aria-label={`${business.name}, início`}>
            <span className="blinker" aria-hidden="true" />
            <span>
              Parada <b>799</b>
            </span>
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/">
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="wrap legal">
        <h1>Política de privacidade</h1>
        <p className="legal-data">Última atualização: {ATUALIZADA_EM}</p>

        <p>
          Esta política explica como a {business.name} (“oficina”, “nós”) trata os dados pessoais de quem pede orçamento
          pelo WhatsApp, visita este site ou é cliente da oficina, de acordo com a Lei Geral de Proteção de Dados (LGPD,
          Lei nº 13.709/2018).
        </p>

        <h2>1. Quem é o responsável pelos dados</h2>
        <p>
          A {business.name} é a responsável (controladora) pelos dados tratados nos seus canais de atendimento.{" "}
          {business.address}.
        </p>

        <h2>2. Quais dados tratamos, para quê e com que base legal</h2>

        <h3>Pedido de orçamento pelo WhatsApp</h3>
        <ul>
          <li>
            <strong>Dados:</strong> número do seu WhatsApp, nome, modelo e ano do veículo, serviço de que precisa,
            mensagens e fotos ou outros arquivos que você enviar.
          </li>
          <li>
            <strong>Para quê:</strong> entender o problema, preparar o orçamento e retornar o contato.
          </li>
          <li>
            <strong>Base legal:</strong> procedimentos preliminares relacionados a um contrato, a pedido seu (art. 7º,
            V, da LGPD).
          </li>
        </ul>

        <h3>Cadastro de clientes e serviços na oficina</h3>
        <ul>
          <li>
            <strong>Dados:</strong> nome, telefone, e-mail (se você informar), observações do atendimento, dados do
            veículo (placa, marca, modelo, ano, cor, quilometragem e foto) e o histórico de ordens de serviço (serviços,
            peças, valores e datas).
          </li>
          <li>
            <strong>Para quê:</strong> executar o serviço contratado, manter o histórico do seu veículo, emitir
            orçamentos e cobranças e atender a garantias.
          </li>
          <li>
            <strong>Base legal:</strong> execução de contrato (art. 7º, V), cumprimento de obrigação legal (art. 7º, II),
            exercício regular de direitos (art. 7º, VI) e legítimo interesse na organização do atendimento (art. 7º,
            IX).
          </li>
        </ul>

        <h3>Visita ao site</h3>
        <ul>
          <li>
            <strong>Dados:</strong> como em qualquer site, o servidor registra informações técnicas da conexão (como
            endereço IP, navegador, data e hora) para garantir a segurança e o funcionamento.
          </li>
          <li>
            <strong>Base legal:</strong> legítimo interesse (art. 7º, IX).
          </li>
          <li>
            <strong>Cookies:</strong> este site não usa ferramentas de análise de audiência nem de publicidade e não
            grava cookies no seu navegador. O mapa de localização é carregado do Google, que pode tratar dados do seu
            acesso conforme a política do próprio Google.
          </li>
        </ul>

        <h2>3. Com quem compartilhamos</h2>
        <p>
          Não vendemos seus dados nem os usamos para publicidade. Usamos empresas que fornecem a infraestrutura do
          atendimento e que tratam os dados apenas para prestar esses serviços:
        </p>
        <ul>
          <li>Meta (WhatsApp): troca de mensagens do atendimento.</li>
          <li>Vercel: hospedagem do site.</li>
          <li>Upstash: armazenamento dos pedidos recebidos pelo WhatsApp.</li>
          <li>Supabase: banco de dados do cadastro de clientes e das ordens de serviço.</li>
          <li>Serviço de armazenamento de arquivos em nuvem: fotos dos veículos.</li>
          <li>Google: mapa de localização.</li>
        </ul>
        <p>
          Também podemos compartilhar dados com autoridades quando a lei exigir. Alguns desses fornecedores podem
          armazenar ou processar dados fora do Brasil, o que é feito conforme as regras da LGPD para transferência
          internacional (art. 33).
        </p>

        <h2>4. Por quanto tempo guardamos os dados</h2>
        <p>
          Guardamos os dados pelo tempo necessário para atender ao pedido, executar o serviço, cumprir obrigações legais
          e atender a garantias. Depois disso, os dados são excluídos ou anonimizados. Você também pode pedir a exclusão
          antes, exceto quando a lei exigir que a oficina mantenha alguma informação.
        </p>

        <h2>5. Seus direitos</h2>
        <p>Pela LGPD (art. 18), você pode pedir à oficina:</p>
        <ul>
          <li>a confirmação de que tratamos seus dados e o acesso a eles;</li>
          <li>a correção de dados incompletos, errados ou desatualizados;</li>
          <li>a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados fora da lei;</li>
          <li>a portabilidade dos dados;</li>
          <li>a informação sobre com quem compartilhamos os dados;</li>
          <li>a revogação do consentimento, quando ele for a base do tratamento;</li>
          <li>a oposição a um tratamento que considere indevido.</li>
        </ul>
        <p>
          Para exercer qualquer um desses direitos, fale com a gente pelos contatos no fim desta página. Podemos pedir
          uma confirmação da sua identidade antes de atender. Se achar que seus dados não estão sendo tratados
          corretamente, você também pode reclamar à{" "}
          <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">
            Autoridade Nacional de Proteção de Dados (ANPD)
          </a>
          .
        </p>

        <h2>6. Segurança</h2>
        <p>
          Adotamos medidas para proteger os dados, como conexão criptografada (HTTPS), acesso à área de gestão restrito
          a usuários autorizados, com login e senha, e controle de acesso no banco de dados. Nenhum sistema é totalmente
          imune a falhas. Se houver um incidente que possa causar risco relevante a você, avisaremos você e a ANPD,
          como a lei determina.
        </p>

        <h2>7. Crianças e adolescentes</h2>
        <p>
          Nossos serviços são destinados a maiores de idade e não coletamos dados de crianças e adolescentes de
          propósito. Se você acredita que isso aconteceu, nos avise para excluirmos as informações.
        </p>

        <h2>8. Mudanças nesta política</h2>
        <p>
          Podemos atualizar esta política. A data da última atualização fica sempre no topo desta página.
        </p>

        <h2>9. Fale com a gente</h2>
        <dl className="legal-contato">
          <dt>Oficina</dt>
          <dd>{business.name}</dd>
          <dt>Endereço</dt>
          <dd>{business.address}</dd>
          {business.phoneDisplay && (
            <>
              <dt>Telefone</dt>
              <dd>{tel ? <a href={tel}>{business.phoneDisplay}</a> : business.phoneDisplay}</dd>
            </>
          )}
          {business.email && (
            <>
              <dt>E-mail</dt>
              <dd>
                <a href={`mailto:${business.email}`}>{business.email}</a>
              </dd>
            </>
          )}
          {business.hours.length > 0 && (
            <>
              <dt>Horário</dt>
              <dd>{business.hours.map((h) => `${h.days}, ${h.time}`).join(" · ")}</dd>
            </>
          )}
        </dl>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-row">
          <span>
            © {new Date().getFullYear()} {business.name}
          </span>
          <Link href="/">Voltar ao site</Link>
        </div>
      </footer>
    </>
  );
}
