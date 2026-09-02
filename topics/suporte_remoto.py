import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from common import executar_monitoramento

TOPIC_NAME = "Suporte Remoto"
LIMIT = 50
TELEGRAM_TOPIC_ID = 17
DISCORD_THREAD_ID = 1544511090933633025
API_URL = f"https://employability-portal.gupy.io/api/v1/jobs?jobName=Suporte&limit={LIMIT}&offset=0&workplaceType=remote"


def processar_vagas():
    return executar_monitoramento(
        topic_name=TOPIC_NAME,
        api_url=API_URL,
        topic_id=TELEGRAM_TOPIC_ID,
        discord_thread_id=DISCORD_THREAD_ID
    )


if __name__ == "__main__":
    processar_vagas()
