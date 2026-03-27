/**
 * Generates Template_Termo_Voluntariado.docx with the full term content,
 * uploads it to Supabase Storage, and updates the DocumentoAMO record.
 *
 * Run: node scripts/seed-termo-template.mjs
 */

import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, NumberFormat, UnderlineType,
  BorderStyle, Table, TableRow, TableCell, WidthType,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load env from .env
const envPath = path.join(__dirname, '..', '.env')
const envLines = readFileSync(envPath, 'utf-8').split('\n')
const env = {}
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  let val = trimmed.slice(eqIdx + 1).trim()
  // Strip surrounding quotes (single or double)
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1)
  }
  env[key] = val
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://qwhiymkxudgckefwzcpk.supabase.co'
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']
const BUCKET       = 'arquivos-referencia'
const STORAGE_PATH = 'documentos-amo/Template_Termo_Voluntariado.docx'
const DATABASE_URL = env['DATABASE_URL']

if (!SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY não encontrada'); process.exit(1) }
if (!DATABASE_URL) { console.error('DATABASE_URL não encontrada'); process.exit(1) }

// ─── Build the Word document ───────────────────────────────────────────────

const bold  = (t) => new TextRun({ text: t, bold: true })
const norm  = (t) => new TextRun({ text: t })
const under = (t) => new TextRun({ text: t, underline: { type: UnderlineType.SINGLE } })

const heading = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_1,
  alignment: AlignmentType.CENTER,
  spacing: { before: 200, after: 120 },
})

const subheading = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 22 })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 80, after: 80 },
})

const clause = (title) => new Paragraph({
  children: [new TextRun({ text: title, bold: true, size: 22 })],
  spacing: { before: 240, after: 100 },
})

const body = (children) => new Paragraph({
  children,
  alignment: AlignmentType.JUSTIFIED,
  spacing: { before: 60, after: 60 },
  indent: { firstLine: 720 },
})

const listItem = (text) => new Paragraph({
  children: [new TextRun({ text })],
  alignment: AlignmentType.JUSTIFIED,
  spacing: { before: 40, after: 40 },
  indent: { left: 720 },
})

const spacer = () => new Paragraph({ text: '', spacing: { before: 80, after: 80 } })

const signatureTable = () => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: {
    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE },
  },
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 48, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [new TextRun({ text: '______________________________________' })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [bold('[NOME DO VOLUNTÁRIO]')],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80 },
            }),
            new Paragraph({
              children: [norm('CPF: [CPF]')],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [norm('Voluntário(a)')],
              alignment: AlignmentType.CENTER,
            }),
          ],
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          },
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ text: '' })],
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          },
        }),
        new TableCell({
          width: { size: 48, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [new TextRun({ text: '______________________________________' })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [bold('Associação Missão Ômega')],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80 },
            }),
            new Paragraph({
              children: [norm('Representante Legal')],
              alignment: AlignmentType.CENTER,
            }),
          ],
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          },
        }),
      ],
    }),
  ],
})

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Times New Roman', size: 24 },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 },
      },
    },
    children: [
      // Header
      new Paragraph({
        children: [new TextRun({ text: '🕊️ AMO — ASSOCIAÇÃO MISSÃO ÔMEGA', bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '1A1A2E' } },
      }),
      heading('TERMO DE ADESÃO AO SERVIÇO VOLUNTÁRIO'),
      subheading('Lei Federal nº 9.608/1998 — Serviço Voluntário'),
      spacer(),

      // Preamble
      body([
        norm('Pel'),
        under('[o/a]'),
        norm(' presente instrumento, '),
        under('[NOME COMPLETO]'),
        norm(', portador'),
        under('[a]'),
        norm(' do CPF nº '),
        under('[000.000.000-00]'),
        norm(', nascid'),
        under('[o/a]'),
        norm(' em '),
        under('[DD/MM/AAAA]'),
        norm(', residente e domiciliad'),
        under('[o/a]'),
        norm(' em '),
        under('[ENDEREÇO COMPLETO]'),
        norm(', doravante denominad'),
        under('[o/a]'),
        bold(' VOLUNTÁRIO(A)'),
        norm(', adere, de forma livre, espontânea e sem qualquer coação, ao Serviço Voluntário da '),
        bold('Associação Missão Ômega'),
        norm(', doravante denominada '),
        bold('ORGANIZAÇÃO'),
        norm('.'),
      ]),

      body([
        norm('A prestação do serviço voluntário será realizada em: '),
        under('[NOME DO PROJETO/EVENTO]'),
        norm('.'),
      ]),

      // Cláusulas
      clause('CLÁUSULA 1ª — DO OBJETO'),
      body([
        norm('O(A) VOLUNTÁRIO(A) prestará serviços voluntários junto à ORGANIZAÇÃO, colaborando com atividades de natureza cívica, cultural, assistencial, filantrópica e missionária, conforme orientações e necessidades da ORGANIZAÇÃO, sem subordinação hierárquica de caráter trabalhista.'),
      ]),

      clause('CLÁUSULA 2ª — DA NATUREZA GRATUITA DO SERVIÇO'),
      body([
        norm('O serviço ora acordado é prestado de forma '),
        bold('inteiramente gratuita e não remunerada'),
        norm(', em consonância com o art. 1º da Lei nº 9.608/1998. A presente adesão '),
        bold('não gera, em hipótese alguma'),
        norm(', direito ao recebimento de qualquer valor financeiro, salário, remuneração, honorários, gratificação ou benefício de natureza econômica. Fica expressamente vedada qualquer interpretação que implique vínculo empregatício, previdenciário ou obrigação de natureza trabalhista entre o(a) VOLUNTÁRIO(A) e a ORGANIZAÇÃO.'),
      ]),

      clause('CLÁUSULA 3ª — DOS COMPROMISSOS DO(A) VOLUNTÁRIO(A)'),
      body([norm('O(A) VOLUNTÁRIO(A) compromete-se a:')]),
      listItem('I.   Exercer suas atividades com dedicação, ética e responsabilidade;'),
      listItem('II.  Guardar sigilo das informações confidenciais a que tiver acesso;'),
      listItem('III. Zelar pelos bens e equipamentos da ORGANIZAÇÃO sob sua responsabilidade;'),
      listItem('IV.  Cumprir as normas internas e orientações da ORGANIZAÇÃO;'),
      listItem('V.   Comunicar, com antecedência, qualquer impossibilidade de comparecimento.'),

      clause('CLÁUSULA 4ª — DAS RESPONSABILIDADES DA ORGANIZAÇÃO'),
      body([norm('A ORGANIZAÇÃO compromete-se a:')]),
      listItem('I.   Orientar o(a) VOLUNTÁRIO(A) quanto às atividades a serem desenvolvidas;'),
      listItem('II.  Proporcionar as condições necessárias para o bom desempenho das atividades voluntárias;'),
      listItem('III. Reconhecer e valorizar a contribuição voluntária prestada.'),

      clause('CLÁUSULA 5ª — DA VIGÊNCIA E RESCISÃO'),
      body([
        norm('O presente Termo vigorará a partir da data de sua assinatura por prazo indeterminado, podendo ser rescindido por qualquer das partes, a qualquer tempo, mediante comunicação prévia com antecedência mínima de 07 (sete) dias.'),
      ]),

      spacer(),
      new Paragraph({
        children: [norm('[Cidade], '), under('[DD de mês de AAAA]'), norm('.')],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 480 },
      }),

      signatureTable(),

      spacer(),
      new Paragraph({
        children: [new TextRun({
          text: 'Documento emitido pelo Sistema de Gestão AMO · Associação Missão Ômega',
          size: 16, color: 'AAAAAA',
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } },
      }),
    ],
  }],
})

// ─── Generate buffer ───────────────────────────────────────────────────────

console.log('Gerando arquivo .docx...')
const buffer = await Packer.toBuffer(doc)
console.log(`Arquivo gerado: ${buffer.length} bytes`)

// ─── Upload to Supabase Storage ────────────────────────────────────────────

console.log('Fazendo upload para Supabase Storage...')
const uploadRes = await fetch(
  `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${STORAGE_PATH}`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'x-upsert': 'true',
    },
    body: buffer,
  }
)

if (!uploadRes.ok) {
  const err = await uploadRes.text()
  console.error('Erro no upload:', err)
  process.exit(1)
}

const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${STORAGE_PATH}`
console.log('Upload concluído:', publicUrl)

// ─── Update DocumentoAMO record via Postgres ──────────────────────────────

console.log('Atualizando registro na Biblioteca de Documentos...')

// Use Supabase REST API to update the record
const updateRes = await fetch(
  `${SUPABASE_URL}/rest/v1/DocumentoAMO?titulo=eq.Template_Termo_Voluntariado_Date`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      urlArquivo:    publicUrl,
      pathArquivo:   STORAGE_PATH,
      nomeArquivo:   'Template_Termo_Voluntariado.docx',
      tipoArquivo:   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      tamanhoArquivo: buffer.length,
    }),
  }
)

const updateJson = await updateRes.json()
if (!updateRes.ok) {
  console.error('Erro ao atualizar registro:', JSON.stringify(updateJson))
  process.exit(1)
}

console.log('✅ Concluído! Registro atualizado:', JSON.stringify(updateJson).substring(0, 200))
console.log('URL pública:', publicUrl)
