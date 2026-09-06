import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from common import executar_monitoramento

TOPIC_NAME = "JR Remoto"
LIMIT = 100
TELEGRAM_TOPIC_ID = 132
API_URL = f"https://portal.gupy.io/api/job-search/jobs?jobName=jr&limit={LIMIT}&offset=0&workplaceType=remote"


def processar_vagas():
    return executar_monitoramento(
        topic_name=TOPIC_NAME,
        api_url=API_URL,
        topic_id=TELEGRAM_TOPIC_ID
    )


if __name__ == "__main__":
    processar_vagas()

