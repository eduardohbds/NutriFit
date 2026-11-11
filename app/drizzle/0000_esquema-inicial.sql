CREATE TABLE `acao_ia` (
	`id` text PRIMARY KEY NOT NULL,
	`comando` text NOT NULL,
	`criada_em` text NOT NULL,
	`tipo` text NOT NULL,
	`resultado` text NOT NULL,
	`versao_criada_id` text,
	`resumo` text,
	`desfeita` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`versao_criada_id`) REFERENCES `versao_ficha`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `copia_backup` (
	`id` text PRIMARY KEY NOT NULL,
	`criada_em` text NOT NULL,
	`resultado` text NOT NULL,
	`conteudo` text
);
--> statement-breakpoint
CREATE TABLE `etapa_drop_set` (
	`id` text PRIMARY KEY NOT NULL,
	`serie_executada_id` text NOT NULL,
	`posicao` integer NOT NULL,
	`carga_gramas` integer NOT NULL,
	`repeticoes` integer NOT NULL,
	FOREIGN KEY (`serie_executada_id`) REFERENCES `serie_executada`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "etapa_drop_set_carga" CHECK("etapa_drop_set"."carga_gramas" IS NULL OR "etapa_drop_set"."carga_gramas" >= 0),
	CONSTRAINT "etapa_drop_set_repeticoes" CHECK("etapa_drop_set"."repeticoes" IS NULL OR "etapa_drop_set"."repeticoes" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `etapa_drop_set_posicao` ON `etapa_drop_set` (`serie_executada_id`,`posicao`);--> statement-breakpoint
CREATE TABLE `exercicio` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`situacao` text NOT NULL,
	`origem` text NOT NULL,
	`unilateral` integer DEFAULT false NOT NULL,
	`equipamento` text
);
--> statement-breakpoint
CREATE TABLE `exercicio_grupo` (
	`id` text PRIMARY KEY NOT NULL,
	`exercicio_id` text NOT NULL,
	`grupo_id` text NOT NULL,
	`papel` text NOT NULL,
	FOREIGN KEY (`exercicio_id`) REFERENCES `exercicio`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grupo_id`) REFERENCES `grupo_muscular`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "exercicio_grupo_papel" CHECK("exercicio_grupo"."papel" IN ('direto', 'indireto'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercicio_grupo_unico` ON `exercicio_grupo` (`exercicio_id`,`grupo_id`);--> statement-breakpoint
CREATE TABLE `exercicio_sessao` (
	`id` text PRIMARY KEY NOT NULL,
	`sessao_id` text NOT NULL,
	`exercicio_id` text NOT NULL,
	`item_origem_id` text,
	`posicao` integer NOT NULL,
	`observacoes` text,
	FOREIGN KEY (`sessao_id`) REFERENCES `sessao`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercicio_id`) REFERENCES `exercicio`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_origem_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercicio_sinonimo` (
	`id` text PRIMARY KEY NOT NULL,
	`exercicio_id` text NOT NULL,
	`texto` text NOT NULL,
	FOREIGN KEY (`exercicio_id`) REFERENCES `exercicio`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercicio_sinonimo_unico` ON `exercicio_sinonimo` (`exercicio_id`,`texto`);--> statement-breakpoint
CREATE TABLE `ficha` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`situacao` text NOT NULL,
	`origem` text NOT NULL,
	`criada_em` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ficha_uma_ativa` ON `ficha` (`situacao`) WHERE situacao = 'ativa';--> statement-breakpoint
CREATE TABLE `grupo_muscular` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grupo_muscular_nome_unique` ON `grupo_muscular` (`nome`);--> statement-breakpoint
CREATE TABLE `item` (
	`id` text PRIMARY KEY NOT NULL,
	`rotina_id` text NOT NULL,
	`exercicio_id` text NOT NULL,
	`posicao` integer NOT NULL,
	`grupo_sequencia` text,
	`unilateral` integer DEFAULT false NOT NULL,
	`travado` integer DEFAULT false NOT NULL,
	`observacoes` text,
	FOREIGN KEY (`rotina_id`) REFERENCES `rotina`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercicio_id`) REFERENCES `exercicio`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_posicao` ON `item` (`rotina_id`,`posicao`);--> statement-breakpoint
CREATE TABLE `medicao_corporal` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`peso_gramas` integer,
	`cintura_mm` integer,
	`pescoco_mm` integer,
	`quadril_mm` integer,
	`removida_em` text,
	CONSTRAINT "medicao_corporal_alguma_medida" CHECK(COALESCE("medicao_corporal"."peso_gramas", "medicao_corporal"."cintura_mm", "medicao_corporal"."pescoco_mm", "medicao_corporal"."quadril_mm") IS NOT NULL),
	CONSTRAINT "medicao_corporal_peso" CHECK("medicao_corporal"."peso_gramas" IS NULL OR "medicao_corporal"."peso_gramas" >= 0),
	CONSTRAINT "medicao_corporal_cintura" CHECK("medicao_corporal"."cintura_mm" IS NULL OR "medicao_corporal"."cintura_mm" >= 0),
	CONSTRAINT "medicao_corporal_pescoco" CHECK("medicao_corporal"."pescoco_mm" IS NULL OR "medicao_corporal"."pescoco_mm" >= 0),
	CONSTRAINT "medicao_corporal_quadril" CHECK("medicao_corporal"."quadril_mm" IS NULL OR "medicao_corporal"."quadril_mm" >= 0)
);
--> statement-breakpoint
CREATE TABLE `meta_semanal` (
	`id` text PRIMARY KEY NOT NULL,
	`grupo_id` text NOT NULL,
	`valor_centesimos` integer NOT NULL,
	FOREIGN KEY (`grupo_id`) REFERENCES `grupo_muscular`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "meta_semanal_valor" CHECK("meta_semanal"."valor_centesimos" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_semanal_grupo_id_unique` ON `meta_semanal` (`grupo_id`);--> statement-breakpoint
CREATE TABLE `perfil` (
	`id` text PRIMARY KEY NOT NULL,
	`unico` integer DEFAULT 1 NOT NULL,
	`objetivo` text,
	`objetivo_outro` text,
	`nivel` text,
	`limitacoes` text,
	`equipamentos` text,
	`sexo` text,
	`altura_mm` integer,
	`unidade_carga` text,
	`limiar_rir` integer,
	`metodo_contagem` text,
	`metodo_composicao` text,
	`bloqueio_ativo` integer,
	`bloqueio_espera_segundos` integer,
	CONSTRAINT "perfil_unico" CHECK("perfil"."unico" = 1),
	CONSTRAINT "perfil_altura" CHECK("perfil"."altura_mm" IS NULL OR "perfil"."altura_mm" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `perfil_unico_unique` ON `perfil` (`unico`);--> statement-breakpoint
CREATE TABLE `rotina` (
	`id` text PRIMARY KEY NOT NULL,
	`versao_id` text NOT NULL,
	`nome` text NOT NULL,
	`dia_semana` integer,
	`posicao` integer NOT NULL,
	FOREIGN KEY (`versao_id`) REFERENCES `versao_ficha`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "rotina_dia" CHECK("rotina"."dia_semana" IS NULL OR "rotina"."dia_semana" BETWEEN 1 AND 7)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rotina_posicao` ON `rotina` (`versao_id`,`posicao`);--> statement-breakpoint
CREATE TABLE `serie_executada` (
	`id` text PRIMARY KEY NOT NULL,
	`exercicio_sessao_id` text NOT NULL,
	`posicao` integer NOT NULL,
	`tipo` text NOT NULL,
	`carga_gramas` integer,
	`repeticoes` integer,
	`repeticoes_outro_lado` integer,
	`segundos` integer,
	`segundos_outro_lado` integer,
	`rir` integer,
	`tecnica` text,
	`concluida_em` text NOT NULL,
	`removida_em` text,
	FOREIGN KEY (`exercicio_sessao_id`) REFERENCES `exercicio_sessao`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "serie_executada_carga" CHECK("serie_executada"."carga_gramas" IS NULL OR "serie_executada"."carga_gramas" >= 0),
	CONSTRAINT "serie_executada_repeticoes" CHECK("serie_executada"."repeticoes" IS NULL OR "serie_executada"."repeticoes" >= 0),
	CONSTRAINT "serie_executada_repeticoes_outro_lado" CHECK("serie_executada"."repeticoes_outro_lado" IS NULL OR "serie_executada"."repeticoes_outro_lado" >= 0),
	CONSTRAINT "serie_executada_segundos" CHECK("serie_executada"."segundos" IS NULL OR "serie_executada"."segundos" >= 0),
	CONSTRAINT "serie_executada_segundos_outro_lado" CHECK("serie_executada"."segundos_outro_lado" IS NULL OR "serie_executada"."segundos_outro_lado" >= 0),
	CONSTRAINT "serie_executada_rir" CHECK("serie_executada"."rir" IS NULL OR "serie_executada"."rir" BETWEEN 0 AND 5)
);
--> statement-breakpoint
CREATE TABLE `serie_planejada` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`posicao` integer NOT NULL,
	`meta_tipo` text NOT NULL,
	`meta_minimo` integer,
	`meta_maximo` integer,
	`meta_segundos` integer,
	`carga_gramas` integer,
	`tecnica` text,
	`descanso_segundos` integer,
	FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "serie_planejada_carga" CHECK("serie_planejada"."carga_gramas" IS NULL OR "serie_planejada"."carga_gramas" >= 0),
	CONSTRAINT "serie_planejada_descanso" CHECK("serie_planejada"."descanso_segundos" IS NULL OR "serie_planejada"."descanso_segundos" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `serie_planejada_posicao` ON `serie_planejada` (`item_id`,`posicao`);--> statement-breakpoint
CREATE TABLE `sessao` (
	`id` text PRIMARY KEY NOT NULL,
	`inicio` text NOT NULL,
	`fim` text,
	`ficha_id` text,
	`versao_id` text,
	`rotina_id` text,
	`situacao` text NOT NULL,
	`observacao` text,
	FOREIGN KEY (`ficha_id`) REFERENCES `ficha`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`versao_id`) REFERENCES `versao_ficha`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rotina_id`) REFERENCES `rotina`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sessao_versao_com_ficha" CHECK("sessao"."versao_id" IS NULL OR "sessao"."ficha_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE `versao_ficha` (
	`id` text PRIMARY KEY NOT NULL,
	`ficha_id` text NOT NULL,
	`numero` integer NOT NULL,
	`autor` text NOT NULL,
	`criada_em` text NOT NULL,
	`motivo` text,
	`resumo` text,
	FOREIGN KEY (`ficha_id`) REFERENCES `ficha`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `versao_ficha_numero` ON `versao_ficha` (`ficha_id`,`numero`);