import os
from common import executar_monitoramento

TOPIC_NAME = "Service Desk Remoto"
LIMIT = 50
API_URL = f"https://employability-portal.gupy.io/api/v1/jobs?jobName=Service%20Desk&limit={LIMIT}&offset=0&workplaceType=remote"
TELEGRAM_TOPIC_ID = os.getenv("TELEGRAM_TOPIC_SERVICE_DESK_REMOTO_ID") or "22"


def processar_vagas():
    return executar_monitoramento(
        topic_name=TOPIC_NAME,
        api_url=API_URL,
        topic_id=TELEGRAM_TOPIC_ID
    )


if __name__ == "__main__":
    processar_vagas()
