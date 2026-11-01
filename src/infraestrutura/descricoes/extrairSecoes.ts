import { load } from 'cheerio';
import { semAcento } from '../../dominio/texto';
import type { BlocoDeDescricao, SecaoDeDescricao, TipoDeBloco } from '../../dominio/vaga';

const TITULO_RESPONSABILIDADES = 'Responsabilidades';
const TITULO_GENERICO = 'Descrição';
const MIN_CARACTERES_DO_ITEM = 3;
const MIN_CARACTERES_DE_ITEM_COMPLETO = 25;
const PONTUACAO_FINAL = '.!?;:';

const TITULOS_PADRONIZADOS: Record<string, string> = {
  requisitos: 'Requisitos',
  'requisitos e qualificacoes': 'Requisitos',
  qualificacoes: 'Requisitos',
  requirements: 'Requisitos',
  qualifications: 'Requisitos',
  education: 'Requisitos',
  'informacoes adicionais': 'Informações adicionais',
  'informacoes complementares': 'Informações adicionais',
  beneficios: 'Benefícios',
  benefits: 'Benefícios',
  salario: 'Salário',
  remuneracao: 'Salário',
  'jornada de trabalho': 'Jornada de trabalho',
  'horario de trabalho': 'Jornada de trabalho',
  'horarios de trabalho': 'Jornada de trabalho',
  'local de trabalho': 'Local de trabalho',
  endereco: 'Local de trabalho',
};

// Cabeçalho só vale fora de frase: rejeita "suas responsabilidades." no meio do texto.
const INICIO_NO_TEXTO =
  /(?<![a-zà-ú] )(?:Principais\s+)?[Rr]esponsabilidades(?:\s*(?:e|&)\s*[Aa]tribui(?:ç(?:õ|o)?(?:es|e)|ções))?\s*[:\-–]?\s*(?![ ]*[a-zà-ú])/u;

// Títulos que dividem o texto achatado pela API, que cola as seções umas nas outras.
const SECAO_NO_TEXTO =
  /(?<![A-Za-zÀ-ú0-9])(?:Requisitos(?:\s+e\s+[Qq]ualifica(?:ç(?:õ|o)?(?:es|e)))?|Qualifica(?:ç(?:õ|o)?(?:es|e)|ções)|Informa(?:ç(?:õ|o)?es\s+(?:adicionais|complementares))|Benef(?:í|i)cios|Sal(?:á|a)rio|Remunera(?:ç|c)(?:ão|ao)|Jornada\s+de\s+trabalho|Horário(?:s)?\s+de\s+trabalho|Local\s+de\s+[Tt]rabalho|Endere(?:ç|c)o|Education|Requirements|Qualifications|Benefits)(?:\s*:?\s*\n|\s*:?\s*(?=\s*(?:&nbsp;)*\s*(?:[A-ZÀ-Ú0-9•➢▪◦‣·∙»➜→])|&\w+;)|\s*:\s*)/gu;

// ";" sempre separa. A barra antes do ponto evita cortar "Java/.NET".
const SEPARADORES_DE_ITEM =
  /;+|[•➢▪◦‣·∙]|➜|→|»|(?<=(?<!\/)[.!?])\s*(?=[A-ZÀ-Ú])|\n\s*(?=[A-ZÀ-Ú•➢▪])/u;

const ENTIDADES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

function normalizar(texto: string): string {
  return texto.replace(/\s+/g, ' ').replace(/^[ \t:;\-–—•➢]+|[ \t:;\-–—•➢]+$/g, '');
}

function tituloPadronizado(titulo: string): string {
  const limpo = normalizar(titulo).replace(/:+$/, '');
  return TITULOS_PADRONIZADOS[semAcento(limpo)] ?? (limpo || TITULO_RESPONSABILIDADES);
}

interface BlocoBruto {
  tipo: TipoDeBloco | 'titulo';
  texto: string;
}

function tipoDoElemento(tag: string): BlocoBruto['tipo'] | null {
  if (/^h[1-6]$/.test(tag)) return 'titulo';
  if (tag === 'li') return 'item';
  if (tag === 'strong' || tag === 'b') return 'subtitulo';
  return null;
}

/** Lê o HTML na ordem do documento, preservando títulos, itens e subtítulos. */
function htmlParaBlocos(html: string): BlocoBruto[] {
  const $ = load(`<main>${html}</main>`);
  const blocos: BlocoBruto[] = [];
  const quebras = new Set(['p', 'div', 'ul', 'ol', 'tr', 'td', 'th', 'br', 'hr']);
  let textoAcumulado = '';

  const descarregar = (tipo: BlocoBruto['tipo'] = 'texto') => {
    const texto = textoAcumulado.replace(/\s+/g, ' ').trim();
    if (texto) blocos.push({ tipo, texto });
    textoAcumulado = '';
  };

  const percorrer = (no: ReturnType<typeof $>[number]) => {
    if (no.type === 'text') {
      textoAcumulado += no.data;
      return;
    }
    if (no.type !== 'tag') return;

    const tipo = tipoDoElemento(no.name);
    if (tipo || quebras.has(no.name)) descarregar();
    for (const filho of no.children) percorrer(filho as ReturnType<typeof $>[number]);
    if (tipo) descarregar(tipo);
    else if (quebras.has(no.name)) descarregar();
  };

  const raiz = $('main').get(0);
  if (raiz) percorrer(raiz);
  descarregar();
  return blocos;
}

function agruparEmSecoes(blocos: BlocoBruto[], tituloInicial: string): SecaoDeDescricao[] {
  const secoes: SecaoDeDescricao[] = [];
  let atual: SecaoDeDescricao | null = null;

  for (const bloco of blocos) {
    if (bloco.tipo === 'titulo') {
      atual = { titulo: tituloPadronizado(bloco.texto), blocos: [] };
      secoes.push(atual);
      continue;
    }
    if (!atual) {
      atual = { titulo: tituloInicial, blocos: [] };
      secoes.push(atual);
    }
    atual.blocos.push({ tipo: bloco.tipo, texto: bloco.texto });
  }
  return secoes.filter((secao) => secao.blocos.length > 0);
}

/**
 * Agrupa a descrição em seções a partir de "Responsabilidades", pulando o texto de
 * marketing que costuma vir antes. Sem esse título, mostra o texto inteiro em vez de
 * esconder a descrição: as fontes novas nem sempre seguem o modelo da Gupy.
 */
export function extrairSecoesDoHtml(html: string): SecaoDeDescricao[] {
  const blocos = htmlParaBlocos(html);
  const inicio = blocos.findIndex(
    (bloco) => bloco.tipo === 'titulo' && /responsabilidades/i.test(bloco.texto),
  );
  return inicio >= 0
    ? agruparEmSecoes(blocos.slice(inicio + 1), TITULO_RESPONSABILIDADES)
    : agruparEmSecoes(blocos, TITULO_GENERICO);
}

function quebrarEmItens(trechoOriginal: string): string[] {
  let trecho = trechoOriginal.replace(/<[^>]+>/g, ' ');
  for (const [entidade, caractere] of Object.entries(ENTIDADES)) {
    trecho = trecho.replaceAll(entidade, caractere);
  }

  const itens: string[] = [];
  for (const bloco of trecho.split(SEPARADORES_DE_ITEM)) {
    let item = '';
    for (const pedaco of bloco.split(/[\n\r]+| /)) {
      const parte = normalizar(pedaco);
      if (parte.length < MIN_CARACTERES_DO_ITEM) continue;
      // Recola o que o "&nbsp;" ou o achatamento cortou no meio da frase.
      const itemIncompleto =
        item.length < MIN_CARACTERES_DE_ITEM_COMPLETO || !PONTUACAO_FINAL.includes(item.at(-1) ?? '');
      if (item && itemIncompleto) {
        item = `${item} ${parte}`;
      } else {
        if (item) itens.push(item);
        item = parte;
      }
    }
    if (item) itens.push(item);
  }
  return itens;
}

function itensParaBlocos(itens: string[]): BlocoDeDescricao[] {
  return itens.map((texto) => ({ tipo: 'item', texto }));
}

/** Reserva para quando só existe o texto achatado, sem marcação. */
export function extrairSecoesDoTexto(descricao: string): SecaoDeDescricao[] {
  if (!descricao) return [];

  const inicio = INICIO_NO_TEXTO.exec(descricao);
  const semResponsabilidades = !inicio;
  const inicioDoTrecho = inicio ? inicio.index + inicio[0].length : 0;
  // Quebra de linha seguida de minúscula é continuação de frase, não item novo.
  const trecho = descricao.slice(inicioDoTrecho).replace(/\n\s*(?=[a-zà-ú])/gu, ' ');

  const tituloInicial = semResponsabilidades ? TITULO_GENERICO : TITULO_RESPONSABILIDADES;
  const marcas = [{ fimDaSecaoAnterior: 0, inicioDoConteudo: 0, titulo: tituloInicial }];
  for (const corte of trecho.matchAll(SECAO_NO_TEXTO)) {
    marcas.push({
      fimDaSecaoAnterior: corte.index,
      inicioDoConteudo: corte.index + corte[0].length,
      titulo: tituloPadronizado(corte[0]),
    });
  }

  const secoes: SecaoDeDescricao[] = [];
  marcas.forEach((marca, indice) => {
    const fim = marcas[indice + 1]?.fimDaSecaoAnterior ?? trecho.length;
    const blocos = itensParaBlocos(quebrarEmItens(trecho.slice(marca.inicioDoConteudo, fim)));
    if (blocos.length === 0) return;

    const anterior = secoes.at(-1);
    if (anterior?.titulo === marca.titulo) anterior.blocos.push(...blocos);
    else secoes.push({ titulo: marca.titulo, blocos });
  });
  return secoes;
}
