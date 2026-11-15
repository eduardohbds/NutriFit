// Carregado só pelo projeto de interface (jest.config.js): o primeiro render de uma rota leva 8 s
// com o cache frio e a máquina ocupada, e o padrão é de 5 s (US-043).
jest.setTimeout(30_000);
