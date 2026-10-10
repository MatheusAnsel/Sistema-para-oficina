import { business } from "@/config/business";
import ChatPreview from "@/components/ChatPreview";
import IconeServico from "@/components/IconeServico";
import { fotoPublica } from "@/lib/foto-publica";
import { directionsUrl, mapsEmbedUrl, phoneTel, serviceMessage, siteUrl, whatsappLink } from "@/lib/site";

const steps = [
  {
    title: "Toque em pedir orçamento",
    text: "O WhatsApp abre com a mensagem pronta. É só enviar.",
  },
  {
    title: "Responda cinco perguntas",
    text: "Nome, veículo, ano, tipo de serviço e uma foto do problema, se tiver.",
  },
  {
    title: "Receba o valor",
    text: "A oficina recebe o pedido completo e retorna com o orçamento.",
  },
];

export default function Home() {
  const cta = whatsappLink();
  const embed = mapsEmbedUrl();
  const directions = directionsUrl();
  const tel = phoneTel();
  const hasDetails = business.address || business.phoneDisplay || business.hours.length > 0;

  // Fotos: o carro do hero ja existe em public/fundo; as demais sao opcionais (docs/imagens-do-site.md).
  const fotoHero = fotoPublica("fundo", "carro");
  const fotoDetalhe = fotoPublica("site", "detalhe");
  const fotoGaleria1 = fotoPublica("site", "galeria-1");
  const fotoGaleria2 = fotoPublica("site", "galeria-2");
  const nota = business.rating ? business.rating.value.toFixed(1).replace(".", ",") : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: business.name,
    url: siteUrl,
    ...(business.addressParts
      ? { address: { "@type": "PostalAddress", ...business.addressParts, addressCountry: "BR" } }
      : business.address
        ? { address: business.address }
        : {}),
    ...(business.phoneDisplay ? { telephone: `+55${business.phoneDisplay.replace(/\D/g, "")}` } : {}),
    ...(business.hoursSchema ? { openingHours: business.hoursSchema } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="lx-header">
        <div className="wrap lx-header-row">
          <a className="wordmark" href="#topo" aria-label={`${business.name}, início`}>
            <span className="blinker" aria-hidden="true" />
            <span>
              Parada <b>799</b>
            </span>
          </a>
          <nav className="lx-nav" aria-label="Seções">
            <a href="#problemas">Serviços</a>
            <a href="#como-funciona">Como funciona</a>
            {business.reviews.length > 0 && <a href="#avaliacoes">Avaliações</a>}
            <a href="#onde-estamos">Onde estamos</a>
          </nav>
          <div className="lx-header-actions">
            <a className="lx-link-gestao" href="/gestao">
              Gestão
            </a>
            {business.phoneDisplay && tel ? (
              <a className="lx-btn lx-btn--sm" href={tel}>
                {business.phoneDisplay}
              </a>
            ) : (
              <a className="lx-btn lx-btn--sm" href={cta} target="_blank" rel="noopener">
                Pedir orçamento
              </a>
            )}
          </div>
        </div>
      </header>

      <main id="topo">
        <section className="lx-hero">
          <div className="lx-hero-media" aria-hidden="true">
            <div className="lx-hero-panels">
              <span />
              <span />
              <span />
              <span />
            </div>
            {fotoHero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="lx-hero-img" src={fotoHero} alt="" width={2400} height={1340} fetchPriority="high" />
            )}
            <div className="lx-hero-veil" />
          </div>
          <div className="wrap">
            <div className="lx-hero-copy">
              <h1>Orçamento pelo WhatsApp, sem ligação e sem fila.</h1>
              <p className="lx-lead">
                Toque no botão, responda algumas perguntas e mande uma foto do problema. A oficina recebe tudo
                organizado e retorna com o valor.
              </p>
              <div className="lx-actions">
                <a className="lx-btn" href={cta} target="_blank" rel="noopener">
                  Pedir orçamento no WhatsApp
                </a>
                <a className="lx-textlink" href={business.googleProfileUrl} target="_blank" rel="noopener">
                  Ver a oficina no Google
                </a>
              </div>
              <p className="lx-fine">
                {nota && business.rating ? `Nota ${nota} no Google, com ${business.rating.count} avaliações. ` : ""}
                O atendimento leva cerca de 2 minutos.
              </p>
            </div>
          </div>
        </section>

        <section className="lx-section" id="problemas">
          <div className="wrap">
            <h2 className="lx-title">O que está acontecendo com o carro?</h2>
            <p className="lx-sublead">
              Escolha o que mais se parece com o seu caso. O WhatsApp abre já com o serviço indicado.
            </p>
            <ul className="lx-cards">
              {business.symptoms.map((s) => (
                <li key={s.id}>
                  <a
                    href={whatsappLink(serviceMessage(s.label, s.id))}
                    target="_blank"
                    rel="noopener"
                    className={s.badge ? "lx-card lx-card--destaque" : "lx-card"}
                  >
                    <span className="lx-card-art">
                      {s.badge && <span className="lx-card-badge">{s.badge}</span>}
                      <IconeServico id={s.id} className="lx-card-icone" />
                    </span>
                    <span className="lx-card-info">
                      <span className="lx-card-nome">{s.label}</span>
                      <span className="lx-card-texto">{s.headline}</span>
                    </span>
                    <span className="lx-card-seta" aria-hidden="true">
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {business.reviews.length > 0 && (
          <section className="lx-section lx-section--faixa" id="avaliacoes">
            <div className="wrap lx-faixa">
              <div className="lx-faixa-media">
                {fotoDetalhe ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoDetalhe} alt="" loading="lazy" />
                ) : (
                  nota && (
                    <div className="lx-nota" role="img" aria-label={`Nota ${nota} de 5 no Google`}>
                      <strong>{nota}</strong>
                      <span aria-hidden="true">★★★★★</span>
                    </div>
                  )
                )}
              </div>
              <div className="lx-faixa-texto">
                <h2 className="lx-title">Quem já passou por aqui</h2>
                {business.rating && nota && (
                  <p className="lx-sublead">
                    Nota {nota} no Google, com {business.rating.count} avaliações.
                  </p>
                )}
                <ul className="lx-reviews">
                  {business.reviews.map((r) => (
                    <li key={r.text}>
                      <p className="lx-review-stars" role="img" aria-label={`${r.stars} de 5 estrelas`}>
                        {"★".repeat(r.stars)}
                      </p>
                      <blockquote>{r.text}</blockquote>
                    </li>
                  ))}
                </ul>
                <a className="lx-follow" href={business.googleProfileUrl} target="_blank" rel="noopener">
                  <span aria-hidden="true" />
                  Ver todos os comentários
                  <span aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        )}

        <section className="lx-section" id="como-funciona">
          <div className="wrap lx-como">
            <div className="lx-como-texto">
              <h2 className="lx-title">Como funciona</h2>
              <ol className="lx-steps">
                {steps.map((s, i) => (
                  <li key={s.title}>
                    <span className="lx-step-n" aria-hidden="true">
                      {i + 1}
                    </span>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </li>
                ))}
              </ol>
              <a className="lx-btn" href={cta} target="_blank" rel="noopener">
                Pedir orçamento
              </a>
            </div>
            <div className="lx-collage">
              {fotoGaleria1 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="lx-collage-foto lx-collage-foto--a" src={fotoGaleria1} alt="" loading="lazy" />
              )}
              {fotoGaleria2 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="lx-collage-foto lx-collage-foto--b" src={fotoGaleria2} alt="" loading="lazy" />
              )}
              <div className="lx-collage-chat">
                <ChatPreview />
              </div>
            </div>
          </div>
        </section>

        <section className="lx-section" id="onde-estamos">
          <div className="wrap">
            <h2 className="lx-title">Onde estamos</h2>
            <div className="lx-onde">
              <div className="lx-onde-info">
                {hasDetails ? (
                  <dl>
                    {business.address && (
                      <div>
                        <dt>Endereço</dt>
                        <dd>{business.address}</dd>
                      </div>
                    )}
                    {business.hours.length > 0 && (
                      <div>
                        <dt>Horário</dt>
                        <dd>
                          {business.hours.map((h) => (
                            <span key={h.days} className="lx-hours-row">
                              {h.days}: {h.time}
                            </span>
                          ))}
                        </dd>
                      </div>
                    )}
                    {business.phoneDisplay && (
                      <div>
                        <dt>Telefone</dt>
                        <dd>{tel ? <a href={tel}>{business.phoneDisplay}</a> : business.phoneDisplay}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="lx-sublead">
                    Endereço, horário de funcionamento e avaliações de clientes estão no Perfil da Empresa no Google.
                  </p>
                )}
                <div className="lx-actions">
                  {directions && (
                    <a className="lx-btn" href={directions} target="_blank" rel="noopener">
                      Como chegar
                    </a>
                  )}
                  <a className="lx-textlink" href={business.googleProfileUrl} target="_blank" rel="noopener">
                    Ver avaliações no Google
                  </a>
                </div>
              </div>
              {embed && (
                <iframe
                  className="lx-mapa"
                  title={`Mapa: ${business.name}`}
                  src={embed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="lx-footer">
        <div className="wrap lx-footer-grid">
          <div className="lx-footer-marca">
            <a className="wordmark" href="#topo" aria-label={`${business.name}, voltar ao topo`}>
              <span className="blinker" aria-hidden="true" />
              <span>
                Parada <b>799</b>
              </span>
            </a>
          </div>
          <address className="lx-footer-contato">
            {business.address && <p>{business.address}</p>}
            {business.phoneDisplay && <p>{tel ? <a href={tel}>{business.phoneDisplay}</a> : business.phoneDisplay}</p>}
            {business.hours.map((h) => (
              <p key={h.days}>
                {h.days}: {h.time}
              </p>
            ))}
          </address>
          <div className="lx-footer-acao">
            <a className="lx-btn lx-btn--cheio" href={cta} target="_blank" rel="noopener">
              Pedir orçamento no WhatsApp
            </a>
          </div>
        </div>
        <div className="wrap lx-footer-base">
          <span>
            © {new Date().getFullYear()} {business.name}
          </span>
          <span className="lx-footer-links">
            <a href="/privacidade">Política de privacidade</a>
            <a href="/gestao">Gestão</a>
          </span>
        </div>
      </footer>
    </>
  );
}
