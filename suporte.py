import json
import os
import urllib.parse
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

# ==========================================
# 1. Configurações Globais
# ==========================================
LIMIT = 50
MAX_DIAS_PUBLICACAO = 2  # Limite máximo de idade da vaga em dias
API_URL = f"https://employability-portal.gupy.io/api/v1/jobs?city=S%C3%A3o%20Bernardo%20do%20Campo,Diadema,Santo%20Andr%C3%A9,S%C3%A3o%20Caetano%20do%20Sul,S%C3%A3o%20Paulo&jobName=Suporte&limit={LIMIT}&offset=0&state=S%C3%A3o%20Paulo"
CACHE_FILE = "vagas_vistas.json"

# Credenciais do Telegram obtidas via Variáveis de Ambiente
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_TOPIC_ID = os.getenv("TELEGRAM_TOPIC_ID")  # Opcional (apenas se usar tópicos)

# Fuso Horário de Brasília
FUSO_SP = ZoneInfo("America/Sao_Paulo")
agora_br = datetime.now(FUSO_SP)


def enviar_telegram(mensagem: str):
    """Envia uma mensagem formatada em HTML para um Chat, Grupo ou Tópico no Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️ AVISO: TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados. Pulando envio.")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": mensagem,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }

    # Se a variável TELEGRAM_TOPIC_ID estiver configurada, redireciona para o tópico específico
    if TELEGRAM_TOPIC_ID:
        try:
            payload["message_thread_id"] = int(TELEGRAM_TOPIC_ID)
        except ValueError:
            print("⚠️ AVISO: TELEGRAM_TOPIC_ID deve ser um número válido. Ignorando tópico.")

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            if resp.status == 200:
                print("✅ Notificação enviada para o Telegram com sucesso!")
            else:
                print(f"❌ Erro ao enviar para o Telegram: Status HTTP {resp.status}")
    except Exception as err:
        print(f"❌ Exceção ao enviar notificação para o Telegram: {err}")


def processar_vagas():
    # ==========================================
    # 2. Carrega histórico de vagas já notificadas
    # ==========================================
    vagas_vistas = set()
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                vagas_vistas = set(json.load(f))
        except Exception:
            vagas_vistas = set()

    # ==========================================
    # 3. Requisição para a API da Gupy
    # ==========================================
    req = urllib.request.Request(
        API_URL,
        headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
    )

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            vagas = data.get("data", [])

            novas_vagas = []
            for vaga in vagas:
                vaga_id = str(vaga.get("id"))
                raw_date = vaga.get("publishedDate")

                if raw_date:
                    data_utc = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                    data_br = data_utc.astimezone(FUSO_SP)

                    # Descarta se a vaga for mais antiga do que o limite estipulado
                    if (agora_br - data_br).days > MAX_DIAS_PUBLICACAO:
                        continue

                    vaga["data_formatada_br"] = data_br.strftime("%d/%m/%Y às %H:%M")

                if vaga_id not in vagas_vistas:
                    novas_vagas.append(vaga)
                    vagas_vistas.add(vaga_id)

            # ==========================================
            # 4. Envio de Notificação e Atualização do Cache
            # ==========================================
            if novas_vagas:
                print(f"Encontradas {len(novas_vagas)} novas vagas!")

                msg_telegram = f"🚀 <b>{len(novas_vagas)} Nova(s) Vaga(s) Encontrada(s)!</b>\n\n"

                for v in novas_vagas:
                    nome = v.get('name', 'Não informado')
                    modalidade = v.get('workplaceType', 'N/I')
                    link = v.get('jobUrl', '')
                    data_pub = v.get('data_formatada_br', 'N/I')

                    msg_telegram += (
                        f"📌 <b>{nome}</b>\n"
                        f"🏢 Modalidade: <i>{modalidade}</i>\n"
                        f"📅 Publicada em: {data_pub}\n"
                        f"🔗 <a href='{link}'>Candidatar-se na vaga</a>\n\n"
                    )

                # Dispara a notificação para o Telegram
                enviar_telegram(msg_telegram)

                # Salva o arquivo de histórico com os IDs atualizados
                with open(CACHE_FILE, "w") as f:
                    json.dump(list(vagas_vistas), f)

            else:
                print(f"Nenhuma vaga nova publicada nos últimos {MAX_DIAS_PUBLICACAO} dias.")

    except Exception as e:
        print(f"Erro ao consultar a API da Gupy: {e}")


if __name__ == "__main__":
    processar_vagas()