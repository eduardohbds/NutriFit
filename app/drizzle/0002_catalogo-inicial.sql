-- Catálogo inicial de exercícios (seção 18.4 da especificação). Só inserções: nenhum dado existente
-- é alterado nem apagado. Identificadores fixos para que todo aparelho tenha os mesmos, o que mantém
-- backup e restauração coerentes. Os grupos vêm da lista fixa da migração 0001.
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07da-787e-bb72-8e394b6dcddf', 'Supino Reto', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07db-7d97-b690-9c3560eed127', '01a1e091-07da-787e-bb72-8e394b6dcddf', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Peitoral'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07dc-7dd1-b39f-d5dd29b47916', '01a1e091-07da-787e-bb72-8e394b6dcddf', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Tríceps'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07dd-7285-89b2-3d610deecf36', '01a1e091-07da-787e-bb72-8e394b6dcddf', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Ombro anterior'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07de-7c3d-874c-251a4695061f', 'Supino Inclinado com Halteres', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07df-7d19-af78-5132fa141684', '01a1e091-07de-7c3d-874c-251a4695061f', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Peitoral'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07e0-7ad1-ba34-d899a79a01b5', '01a1e091-07de-7c3d-874c-251a4695061f', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Ombro anterior'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07e1-780a-9b70-6c73f678ac07', '01a1e091-07de-7c3d-874c-251a4695061f', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Tríceps'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07e2-7fdb-915b-0e7abc2afb15', 'Cross Over', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07e3-701e-bc57-bade5a2a2357', '01a1e091-07e2-7fdb-915b-0e7abc2afb15', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Peitoral'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07e4-7841-a4c5-218f50303992', '01a1e091-07e2-7fdb-915b-0e7abc2afb15', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Ombro anterior'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07e5-7551-bff5-299dbb599d42', 'Paralelas', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07e6-79d8-9ed1-6ef65884d7cb', '01a1e091-07e5-7551-bff5-299dbb599d42', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Peitoral'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07e7-7d49-abfc-09c397fbebcf', '01a1e091-07e5-7551-bff5-299dbb599d42', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Tríceps'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07e8-7296-af18-95ebc24b5762', '01a1e091-07e5-7551-bff5-299dbb599d42', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Ombro anterior'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07e9-70af-9003-df0dde68f8de', 'Tríceps Pulley', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07ea-71e2-9f6c-9b58c234cbf8', '01a1e091-07e9-70af-9003-df0dde68f8de', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Tríceps'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07eb-7b52-b23c-c3745fa73029', 'Tríceps Testa com Barra', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07ec-7080-8066-ef32312f2aa3', '01a1e091-07eb-7b52-b23c-c3745fa73029', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Tríceps'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07ed-7cda-adfd-c65017d4a14c', 'Barra Fixa', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07ee-72a2-bf68-8731f58e3d6d', '01a1e091-07ed-7cda-adfd-c65017d4a14c', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Costas'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07ef-7636-bb7b-ecf063ed1580', '01a1e091-07ed-7cda-adfd-c65017d4a14c', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Bíceps'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07f0-7ea0-a838-c7ea793f2a11', 'Remada Curvada', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07f1-7c82-b3e8-0777c878e681', '01a1e091-07f0-7ea0-a838-c7ea793f2a11', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Costas'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07f2-78fd-87d2-1dee3f396551', '01a1e091-07f0-7ea0-a838-c7ea793f2a11', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Bíceps'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07f3-742d-b108-7dde07b7fdab', 'Pulldown', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07f4-7f48-9c7f-264f1a5e7758', '01a1e091-07f3-742d-b108-7dde07b7fdab', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Costas'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07f5-7fd8-96df-f8a066bcd8db', '01a1e091-07f3-742d-b108-7dde07b7fdab', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Bíceps'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07f6-71a8-950c-e5a0b94815fe', 'Remada na Máquina', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07f7-7bd0-842d-1ca995c095fa', '01a1e091-07f6-71a8-950c-e5a0b94815fe', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Costas'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07f8-772f-9e5a-3dae4117b466', '01a1e091-07f6-71a8-950c-e5a0b94815fe', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Bíceps'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07f9-7f2c-8d8c-8d3e482f46d5', 'Rosca Direta', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07fa-7afd-81b1-da5a5d9e1936', '01a1e091-07f9-7f2c-8d8c-8d3e482f46d5', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Bíceps'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07fb-7daa-99d3-beaa2c566de2', 'Rosca Alternada', 'ativo', 'inicial', 1);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07fc-7f58-8b07-b85bdb2b35f3', '01a1e091-07fb-7daa-99d3-beaa2c566de2', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Bíceps'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-07fd-7d8a-b1ad-80805e27baa6', 'Desenvolvimento com Barra', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07fe-742a-af45-b75172bfd5f1', '01a1e091-07fd-7d8a-b1ad-80805e27baa6', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Ombro anterior'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-07ff-7730-9ebd-c53116ee6c12', '01a1e091-07fd-7d8a-b1ad-80805e27baa6', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Ombro lateral'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0800-7d48-9636-f880e1db2a57', '01a1e091-07fd-7d8a-b1ad-80805e27baa6', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Tríceps'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0801-72e3-97f3-000bbe41fd09', 'Elevação Lateral', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0802-7c2d-833d-7e662da27489', '01a1e091-0801-72e3-97f3-000bbe41fd09', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Ombro lateral'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0803-7b9b-ae0f-b304e842c0ee', 'Elevação Frontal', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0804-772a-a705-7b6a83662b6b', '01a1e091-0803-7b9b-ae0f-b304e842c0ee', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Ombro anterior'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0805-7b43-aacc-91a1be655a6a', 'Encolhimento com Halteres', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0806-7364-ada5-dccdaa8a6914', '01a1e091-0805-7b43-aacc-91a1be655a6a', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Trapézio'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0807-70a7-bf70-383ec458f607', '01a1e091-0805-7b43-aacc-91a1be655a6a', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Antebraço'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0808-7bf2-972a-890e7d18e5f6', 'Rosca de Punho', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0809-7028-aec7-b8218a889428', '01a1e091-0808-7bf2-972a-890e7d18e5f6', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Antebraço'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-080a-7966-bfb5-45bd53733753', 'Rosca de Punho Inversa', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-080b-7832-a9f9-460bb2538d40', '01a1e091-080a-7966-bfb5-45bd53733753', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Antebraço'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_sinonimo` (`id`, `exercicio_id`, `texto`) VALUES ('01a1e091-080c-7438-9678-2602c1a64aba', '01a1e091-080a-7966-bfb5-45bd53733753', 'Reverse Wrist Curl');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-080d-7cb9-8a15-cd0831e2b856', 'Agachamento Livre', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-080e-7a21-9fd0-913dccbc1336', '01a1e091-080d-7cb9-8a15-cd0831e2b856', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Quadríceps'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-080f-7561-ad5e-075ebc5f6149', '01a1e091-080d-7cb9-8a15-cd0831e2b856', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Glúteos'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0810-7e2a-8649-d651cf890dbc', '01a1e091-080d-7cb9-8a15-cd0831e2b856', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Adutores'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0811-79c6-a3ad-5df10f9ef3ce', '01a1e091-080d-7cb9-8a15-cd0831e2b856', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Lombar'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0812-7b93-9e5b-d7bcbb2efd2b', 'Leg Press', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0813-7107-b7c4-4021e8b44ae7', '01a1e091-0812-7b93-9e5b-d7bcbb2efd2b', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Quadríceps'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0814-7f6f-bd1e-133fdf349906', '01a1e091-0812-7b93-9e5b-d7bcbb2efd2b', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Glúteos'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0815-7057-90a1-d84ca3f7ffdb', '01a1e091-0812-7b93-9e5b-d7bcbb2efd2b', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Adutores'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0816-7e71-8ae0-edfbcb6e623e', 'Cadeira Extensora', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0817-7346-b768-2d913910c8ad', '01a1e091-0816-7e71-8ae0-edfbcb6e623e', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Quadríceps'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0818-7726-8482-f4ab0ea0b4c4', 'Cadeira Flexora', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0819-746a-9c57-4976fdb19872', '01a1e091-0818-7726-8482-f4ab0ea0b4c4', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Posterior de coxa'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-081a-7382-9289-487c5de51bf4', 'Panturrilha em Pé', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-081b-775e-8af6-c0aa003fee89', '01a1e091-081a-7382-9289-487c5de51bf4', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Panturrilha'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-081c-7825-9c58-887617af1034', 'Lunges (Passadas)', 'ativo', 'inicial', 1);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-081d-730e-9b25-0dbfd420267b', '01a1e091-081c-7825-9c58-887617af1034', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Quadríceps'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-081e-7b1a-8e0c-9e89f5f45f76', '01a1e091-081c-7825-9c58-887617af1034', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Glúteos'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-081f-75fe-b01c-8e4f8c095d79', '01a1e091-081c-7825-9c58-887617af1034', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Adutores'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0820-784f-9d8f-c5b7df0a11a8', '01a1e091-081c-7825-9c58-887617af1034', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Posterior de coxa'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0821-7b2e-a8aa-741281455c24', 'Corrida', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0822-7762-98c9-44a8e9d57719', 'Esteira', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0823-7431-a7eb-4860ea1c66b8', 'Prancha', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0824-7820-bc55-f632095741fd', '01a1e091-0823-7431-a7eb-4860ea1c66b8', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Abdômen'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0825-7f08-9f6f-fdff1928cd3e', '01a1e091-0823-7431-a7eb-4860ea1c66b8', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Lombar'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0826-7d42-bb17-21df7f5052bf', 'Abdominais Crunch', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0827-7f8b-83f0-6e0f2e321796', '01a1e091-0826-7d42-bb17-21df7f5052bf', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Abdômen'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-0828-77e5-b695-95e309bcf66b', 'Flexões de Braço', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-0829-72ca-845b-a35e74d719eb', '01a1e091-0828-77e5-b695-95e309bcf66b', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Peitoral'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-082a-7ffb-8648-9edad3d91395', '01a1e091-0828-77e5-b695-95e309bcf66b', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Tríceps'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-082b-7756-b321-c5ac397cdd67', '01a1e091-0828-77e5-b695-95e309bcf66b', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Ombro anterior'), 'indireto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-082c-7484-be29-7b5c3f18fbb7', 'Elevação de Pernas', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-082d-76a6-95f1-da8d286ba6b5', '01a1e091-082c-7484-be29-7b5c3f18fbb7', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Abdômen'), 'direto');
--> statement-breakpoint
INSERT INTO `exercicio` (`id`, `nome`, `situacao`, `origem`, `unilateral`) VALUES ('01a1e091-082e-7583-a892-d72e6801f109', 'Elevação Frontal com Halteres', 'ativo', 'inicial', 0);
--> statement-breakpoint
INSERT INTO `exercicio_grupo` (`id`, `exercicio_id`, `grupo_id`, `papel`) VALUES ('01a1e091-082f-75a0-8283-05fa536a4dde', '01a1e091-082e-7583-a892-d72e6801f109', (SELECT `id` FROM `grupo_muscular` WHERE `nome` = 'Ombro anterior'), 'direto');
