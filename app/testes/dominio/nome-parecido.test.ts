import { nomesParecidos } from '../../src/dominio/nome-parecido';

describe('nomesParecidos (RB35)', () => {
  it.each([
    ['igual', 'Remada Curvada', 'Remada Curvada'],
    ['igual só em maiúsculas', 'REMADA CURVADA', 'remada curvada'],
    ['igual só em acentos', 'Elevação Pélvica', 'elevacao pelvica'],
    ['igual só em espaços nas pontas', '  Remada Curvada ', 'Remada Curvada'],
    ['com uma letra a menos', 'Remada Curvda', 'Remada Curvada'],
    ['no plural', 'Agachamento', 'Agachamentos'],
    ['com uma letra trocada em nome médio', 'Supino Reto', 'Supino Reta'],
  ])('considera parecidos os nomes %s', (_caso, a, b) => {
    expect(nomesParecidos(a, b)).toBe(true);
    expect(nomesParecidos(b, a)).toBe(true);
  });

  it.each([
    ['exercícios diferentes com início igual', 'Supino Reto', 'Supino Inclinado'],
    ['variações de um mesmo aparelho', 'Elevação Frontal', 'Elevação Lateral'],
    ['nomes curtos que diferem em uma letra', 'Leg', 'Lag'],
    ['nome curto dentro de um longo', 'Rosca Direta', 'Rosca Direta com Halter'],
  ])('não considera parecidos os nomes de %s', (_caso, a, b) => {
    expect(nomesParecidos(a, b)).toBe(false);
    expect(nomesParecidos(b, a)).toBe(false);
  });
});
