import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# ==========================================
# 1. Configurações Globais
# ==========================================
LIMIT = 50
MAX_DIAS_PUBLICACAO = 2    # Apenas vagas publicadas nos últimos 2 dias
DIAS_RETENCAO_CACHE = 7    # Apaga do cache vagas vistas há mais de 7 dias

API_URL = f"https://employability-portal.gupy.io/api/v1/jobs?city=S%C3%A3o%20Bernardo%20do%20Campo,Diadema,Santo%20Andr%C3%A9,S%C3%A3o%20Caetano%20do%20Sul,S%C3%A3o%20Paulo&jobName=Suporte&limit={LIMIT}&offset=0&state=S%C3%A3o%20Paulo"
CACHE_FILE = "vagas_vistas.json"

# Credenciais do Telegram obtidas via Variáveis de Ambiente
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_TOPIC_ID = os.getenv("TELEGRAM_TOPIC_ID")

# Fuso Horário de Brasília
FUSO_SP = ZoneInfo("America/Sao_Paulo")
agora_br = datetime.now(FUSO_SP)


def enviar_telegram(mensagem: str):
    """Envia uma mensagem formatada em HTML para o Telegram."""
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


def carregar_e_limpar_cache() -> dict:
    """Lê o arquivo de cache e remove registros com mais de DIAS_RETENCAO_CACHE dias."""
    if not os.path.exists(CACHE_FILE):
        return {}

    try:
        with open(CACHE_FILE, "r") as f:
            dados = json.load(f)

        # Suporte para converter a estrutura antiga caso o JSON seja uma lista simples []
        if isinstance(dados, list):
            data_hoje_iso = agora_br.isoformat()
            return {str(vaga_id): data_hoje_iso for vaga_id in dados}

        cache_limpo = {}
        data_limite = agora_br - timedelta(days=DIAS_RETENCAO_CACHE)

        for vaga_id, data_iso in dados.items():
            try:
                data_vista = datetime.fromisoformat(data_iso)
                # Mantém no cache apenas se foi visto nos últimos 7 dias
                if data_vista > data_limite:
                    cache_limpo[str(vaga_id)] = data_iso
            except ValueError:
                continue

        return cache_limpo

    except Exception as err:
        print(f"⚠️ Erro ao ler/limpar o cache: {err}. Reiniciando cache.")
        return {}


def processar_vagas():
    # 2. Carrega o cache e aplica a remoção de registros com mais de 7 dias
    cache_vagas = carregar_e_limpar_cache()

    # 3. Requisição para a API da Gupy
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

                    # Filtro: descarta se a vaga tiver sido publicada há mais de 2 dias
                    if (agora_br - data_br).days > MAX_DIAS_PUBLICACAO:
                        continue

                    vaga["data_formatada_br"] = data_br.strftime("%d/%m/%Y às %H:%M")

                # Checa se a vaga já foi notificada anteriormente
                if vaga_id not in cache_vagas:
                    novas_vagas.append(vaga)
                    cache_vagas[vaga_id] = agora_br.isoformat()

            # 4. Processa os alertas e atualiza o histórico em disco
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

                enviar_telegram(msg_telegram)

                with open(CACHE_FILE, "w") as f:
                    json.dump(cache_vagas, f, indent=2)

            else:
                # Salva o cache limpo para garantir a remoção de registros expirados no histórico
                with open(CACHE_FILE, "w") as f:
                    json.dump(cache_vagas, f, indent=2)

                print(f"Nenhuma vaga nova publicada nos últimos {MAX_DIAS_PUBLICACAO} dias.")

    except Exception as e:
        print(f"Erro ao consultar a API da Gupy: {e}")


if __name__ == "__main__":
    processar_vagas()