import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from common import VAGAS_GERAIS_FILE_DEFAULT, executar_monitoramento

TOPIC_NAME = "Assistente Remoto"
LIMIT = 100
TELEGRAM_TOPIC_ID = None
API_URL = f"https://portal.gupy.io/api/job-search/jobs?jobName=assistente&limit={LIMIT}&offset=0&workplaceType=remote"


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

