import { business } from "@/config/business";
import ChatPreview from "@/components/ChatPreview";
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

      <header className="site-header">
        <div className="wrap header-row">
          <a className="wordmark" href="#topo" aria-label={`${business.name}, início`}>
            <span className="blinker" aria-hidden="true" />
            <span>
              Parada <b>799</b>
            </span>
          </a>
          <nav className="nav" aria-label="Seções">
            <a href="#problemas">Problemas</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#onde-estamos">Onde estamos</a>
          </nav>
          <a className="btn btn-primary btn-sm" href={cta} target="_blank" rel="noopener">
            Pedir orçamento
          </a>
        </div>
      </header>

      <main id="topo">
        <section className="hero wrap">
          <div className="hero-copy">
            <h1>
              Orçamento pelo WhatsApp, sem ligação e sem fila.
            </h1>
            <p className="lead">
              Toque no botão, responda algumas perguntas e mande uma foto do problema. A oficina recebe tudo
              organizado e retorna com o valor.
            </p>
            <div className="actions">
              <a className="btn btn-primary" href={cta} target="_blank" rel="noopener">
                Pedir orçamento no WhatsApp
              </a>
              <a className="btn btn-ghost" href={business.googleProfileUrl} target="_blank" rel="noopener">
                Ver a oficina no Google
              </a>
            </div>
            <p className="fine">
              {business.rating
                ? `Nota ${business.rating.value.toFixed(1).replace(".", ",")} no Google, com ${business.rating.count} avaliações. `
                : ""}
              O atendimento leva cerca de 2 minutos.
            </p>
          </div>
          <ChatPreview />
        </section>

        <section className="section wrap" id="como-funciona">
          <h2>Como funciona</h2>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {business.reviews.length > 0 && (
          <section className="section wrap" id="avaliacoes">
            <h2>Quem já passou por aqui</h2>
            {business.rating && (
              <p className="section-lead">
                Nota {business.rating.value.toFixed(1).replace(".", ",")} no Google, com {business.rating.count} avaliações.
              </p>
            )}
            <ul className="reviews">
              {business.reviews.map((r) => (
                <li key={r.text}>
                  <p className="review-stars" role="img" aria-label={`${r.stars} de 5 estrelas`}>
                    {"★".repeat(r.stars)}
                  </p>
                  <blockquote>{r.text}</blockquote>
                  <p className="review-src">Avaliação no Google</p>
                </li>
              ))}
            </ul>
            <a className="btn btn-ghost" href={business.googleProfileUrl} target="_blank" rel="noopener">
              Ver todos os comentários
            </a>
          </section>
        )}

        <section className="section wrap" id="problemas">
          <h2>O que está acontecendo com o carro?</h2>
          <p className="section-lead">
            Escolha o que mais se parece com o seu caso. O WhatsApp abre já com o serviço indicado.
          </p>
          <ul className="symptoms">
            {business.symptoms.map((s) => (
              <li key={s.id}>
                <a
                  href={whatsappLink(serviceMessage(s.label, s.id))}
                  target="_blank"
                  rel="noopener"
                  className={s.badge ? "symptom symptom--highlight" : "symptom"}
                >
                  <span className="symptom-main">
                    {s.badge && <span className="symptom-badge">{s.badge}</span>}
                    <span className="symptom-headline">{s.headline}</span>
                  </span>
                  <span className="symptom-label">{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="section wrap" id="onde-estamos">
          <h2>Onde estamos</h2>
          <div className="where">
            <div className="where-info">
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
                          <span key={h.days} className="hours-row">
                            {h.days}: {h.time}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {business.phoneDisplay && (
                    <div>
                      <dt>Telefone</dt>
                      <dd>{tel ? <a className="tel" href={tel}>{business.phoneDisplay}</a> : business.phoneDisplay}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="section-lead">
                  Endereço, horário de funcionamento e avaliações de clientes estão no Perfil da Empresa no Google.
                </p>
              )}
              <div className="actions where-actions">
                {directions && (
                  <a className="btn btn-primary" href={directions} target="_blank" rel="noopener">
                    Como chegar
                  </a>
                )}
                <a className="btn btn-ghost" href={business.googleProfileUrl} target="_blank" rel="noopener">
                  Ver avaliações no Google
                </a>
              </div>
            </div>
            {embed && (
              <iframe
                className="map"
                title={`Mapa: ${business.name}`}
                src={embed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-row">
          <span>
            © {new Date().getFullYear()} {business.name}
          </span>
          <a href={cta} target="_blank" rel="noopener">
            Pedir orçamento
          </a>
        </div>
      </footer>

      <a className="sticky-cta btn btn-primary" href={cta} target="_blank" rel="noopener">
        Pedir orçamento no WhatsApp
      </a>
    </>
  );
}
