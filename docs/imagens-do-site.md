# Imagens da página inicial

A home usa apenas veículos nacionais (VW Golf, Jetta, Up!, Fox, Gol, Fiat etc.). O carro do
hero já está no projeto (`public/fundo/carro.webp`, Golf + Jetta). As demais fotos são
**opcionais**: cada arquivo que existir aparece sozinho no próximo deploy, sem mexer em código;
sem o arquivo, a seção usa um visual alternativo (nota 5,0 no lugar da foto, e só a conversa
de exemplo na seção "Como funciona").

| Arquivo (webp, avif, png ou jpg) | Onde aparece | Formato sugerido |
| --- | --- | --- |
| `public/fundo/carro.webp` | Hero (já existe) | 2400 x 1340 px, fundo preto puro |
| `public/site/detalhe.webp` | Faixa "Quem já passou por aqui", à esquerda | 1600 x 1200 px, fundo preto |
| `public/site/galeria-1.webp` | "Como funciona", foto de trás (canto superior direito) | 1200 x 1200 px |
| `public/site/galeria-2.webp` | "Como funciona", foto da frente (canto inferior esquerdo) | 960 x 1200 px |

## Regras

- Só carros nacionais. Nada de carro importado ou de luxo.
- Fundo preto puro (#000000) e luz de contorno, no mesmo clima do hero e da referência.
- Sem placa legível e sem texto na imagem.

## Prompts sugeridos (Nano Banana Pro, no Higgsfield)

**detalhe.webp** (4:3)

> Close-up detail of the front end of a Volkswagen Golf GTI Mk7 at night, headlight and
> grille in sharp focus, pure black background (#000000), monochrome dark moody studio
> automotive photography, soft white rim light, subtle amber reflection, no license plate,
> no text, no people, ultra detailed, 4K.

**galeria-1.webp** (1:1)

> A Volkswagen Up! hatchback in three-quarter front view, dark studio, pure black background
> (#000000), moody monochrome lighting with soft white rim light on the roofline and
> fenders, glossy reflections, no license plate, no text, no people, ultra detailed, 4K.

**galeria-2.webp** (4:5)

> A Volkswagen Fox hatchback, low three-quarter rear view, dark studio, pure black
> background (#000000), moody monochrome lighting, soft white rim light, no license plate,
> no text, no people, ultra detailed, 4K.

Para variar, troque o modelo por Gol, Voyage, Polo ou por um Fiat (Argo, Mobi, Uno, Palio).
