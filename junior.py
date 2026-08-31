import os
from common import executar_monitoramento

TOPIC_NAME = "Júnior"
LIMIT = 50
API_URL = f"https://employability-portal.gupy.io/api/v1/jobs?city=S%C3%A3o%20Bernardo%20do%20Campo,Diadema,Santo%20Andr%C3%A9,S%C3%A3o%20Caetano%20do%20Sul,S%C3%A3o%20Paulo&jobName=J%C3%BAnior&limit={LIMIT}&offset=0&state=S%C3%A3o%20Paulo"
TELEGRAM_TOPIC_ID = os.getenv("TELEGRAM_TOPIC_JUNIOR_ID") or "23"


def processar_vagas():
    return executar_monitoramento(
        topic_name=TOPIC_NAME,
        api_url=API_URL,
        topic_id=TELEGRAM_TOPIC_ID
    )


if __name__ == "__main__":
    processar_vagas()
