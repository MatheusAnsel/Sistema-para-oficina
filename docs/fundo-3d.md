# Fundo 3D da página inicial

O fundo é montado por `src/components/FundoDinamico.tsx` em camadas com profundidade
(parallax com o mouse e com a rolagem). As imagens ficam em `public/fundo/`:

| Arquivo (webp, png ou jpg) | O que é | Tamanho sugerido |
| --- | --- | --- |
| `carro.webp` | Golf e Jetta | 2400 x 1350 px |
| `ferramentas.webp` | Ferramentas de mecânico | 1600 x 1600 px |
| `garagem.webp` | Cenário da oficina (opcional) | 2400 x 1350 px |

Sem nenhum arquivo o fundo mostra só os efeitos em CSS (engrenagens girando, luz âmbar e
piso em grade). Cada imagem que for adicionada aparece sozinha no próximo deploy; não é
preciso mexer em código.

## Regra importante: fundo preto puro

As fotos devem ser geradas sobre **preto puro (#000000)**. O site aplica `mix-blend-mode:
screen`, que faz o preto sumir e deixa só o objeto iluminado, sem precisar recortar a
imagem. Peça luz de contorno (rim light) para as partes escuras do carro não ficarem
transparentes demais.

## Prompts para o Nano Banana Pro (Higgsfield)

**Carro** (formato 16:9)

> Two Volkswagen cars parked at a dramatic three-quarter front angle, a silver Golf GTI
> Mk7 in the foreground and a dark grey Jetta slightly behind it, photorealistic studio
> automotive photography, pure black background (#000000), strong amber rim lighting along
> the roofline and fenders, soft white edge light, glossy reflections, low camera angle,
> sharp focus, no brand logos, no license plates, no text, no people, no floor reflection
> pattern, ultra detailed, 4K.

**Ferramentas** (formato 1:1)

> Floating arrangement of mechanic tools on a pure black background (#000000): combination
> wrenches, a socket set with ratchet, a brake disc, a spark plug, a piston and a hydraulic
> jack, photorealistic studio product photography, dramatic amber rim lighting, shallow
> depth of field on the far objects, objects spread so the center-right stays empty, no
> brand logos, no text, no people, ultra detailed, 4K.

**Garagem** (formato 16:9, opcional)

> Wide dark auto repair workshop interior, empty, car lift in the background, tool wall
> softly out of focus, deep black shadows, a few warm amber lamps, cinematic and moody,
> very low brightness, no people, no text, no logos, photorealistic.

Depois de gerar: baixe, converta para **webp** (qualidade 80, idealmente abaixo de 300 KB
por imagem; o carro é a primeira coisa que aparece, então peso importa no celular), salve
com os nomes da tabela em `public/fundo/` e faça o commit.

## Ajustes

Estilos em `src/app/globals.css`, seção "fundo 3d dinâmico". Posição e tamanho de cada
camada estão em `.fundo-camada--carro`, `.fundo-camada--ferramentas` e
`.fundo-camada--garagem` (e as versões de celular no `@media (max-width: 45rem)`). A
intensidade do movimento é o `--d` de cada camada. Quem ativa "reduzir movimento" no
aparelho vê o fundo parado.
