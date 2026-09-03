import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from common import executar_monitoramento

TOPIC_NAME = "Service Desk Remoto"
LIMIT = 50
TELEGRAM_TOPIC_ID = 22
API_URL = f"https://employability-portal.gupy.io/api/v1/jobs?jobName=Service%20Desk&limit={LIMIT}&offset=0&workplaceType=remote"


def processar_vagas():
    return executar_monitoramento(
        topic_name=TOPIC_NAME,
        api_url=API_URL,
        topic_id=TELEGRAM_TOPIC_ID
    )


if __name__ == "__main__":
    processar_vagas()
