-- Cria automaticamente o relatório de viagem para cada agente incluído
-- em uma solicitação. Prazo: 5 dias após a data de volta (Regra 5).
-- Idempotente: pode ser aplicada mesmo se o setup.sql já tiver sido executado.

CREATE OR REPLACE FUNCTION generate_travel_report()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "relatorios_viagem" ("detailId", "createdAt", "prazoLimite", "status")
  SELECT
    NEW.id,
    NOW(),
    s."dataVolta" + INTERVAL '5 days',
    'ABERTO'
  FROM "solicitacoes" s
  WHERE s.id = NEW."solicitationId"
  ON CONFLICT ("detailId") DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_report ON "detalhes_solicitacao";

CREATE TRIGGER trg_create_report
AFTER INSERT ON "detalhes_solicitacao"
FOR EACH ROW
EXECUTE FUNCTION generate_travel_report();
