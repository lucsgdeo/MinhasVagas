import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from common import VAGAS_GERAIS_FILE_DEFAULT, executar_monitoramento

TOPIC_NAME = "Auxiliar Presencial"
LIMIT = 100
TELEGRAM_TOPIC_ID = None
API_URL = f"https://portal.gupy.io/api/job-search/jobs?jobName=AUXILIAR&city=S%C3%A3o%20Bernardo%20do%20Campo,Diadema,Santo%20Andr%C3%A9,S%C3%A3o%20Caetano%20do%20Sul,S%C3%A3o%20Paulo&limit={LIMIT}&offset=0&state=S%C3%A3o%20Paulo"


def processar_vagas():
    return executar_monitoramento(
        topic_name=TOPIC_NAME,
        api_url=API_URL,
        topic_id=TELEGRAM_TOPIC_ID,
        vagas_recentes_file=VAGAS_GERAIS_FILE_DEFAULT,
        notificar_telegram=False
    )


if __name__ == "__main__":
    processar_vagas()

