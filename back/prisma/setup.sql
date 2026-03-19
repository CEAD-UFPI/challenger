-- 1. Cria a função que gera o relatório
CREATE OR REPLACE FUNCTION generate_travel_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Insere na tabela de relatórios
  -- Define prazo de 5 dias após a DATA DE VOLTA da solicitação pai
  INSERT INTO "relatorios_viagem" (
    "detailId", 
    "createdAt", 
    "prazoLimite", 
    "status"
  )
  SELECT 
    NEW.id, 
    NOW(), 
    (SELECT "dataVolta" FROM "solicitacoes" WHERE id = NEW."solicitationId") + INTERVAL '5 days',
    'ABERTO';
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Cria o gatilho (Dispara quando um Detalhe/Agente é inserido na solicitação)
DROP TRIGGER IF EXISTS trg_create_report ON "detalhes_solicitacao";

CREATE TRIGGER trg_create_report
AFTER INSERT ON "detalhes_solicitacao"
FOR EACH ROW
EXECUTE FUNCTION generate_travel_report();