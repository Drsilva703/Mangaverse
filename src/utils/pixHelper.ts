/**
 * Utilitário para Geração de Código Pix no padrão EMV (BR Code)
 * compatível com todos os bancos brasileiros (Nubank, Inter, Itaú, Bradesco, etc.)
 */

export const DEFAULT_PIX_KEY = '4970bdb1-d6e0-4a23-9d06-365d1f89687c';
export const DEFAULT_PIX_NAME = 'MangáOreo / Denilson';
export const DEFAULT_PIX_CITY = 'Brasil';

/**
 * Formata um campo no formato TLV (Tag, Length, Value)
 */
function formatTlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Normaliza strings para caracteres ASCII válidos no padrão EMV
 */
function sanitizeText(str: string, maxLen: number): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, maxLen);
}

/**
 * Calcula o checksum CRC16 (polinômio 0x1021) segundo o padrão Pix / EMV
 */
function computeCrc16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera a string completa no padrão "Pix Copia e Cola" (BR Code)
 */
export function generatePixBrCode(
  pixKey: string = DEFAULT_PIX_KEY,
  amount?: number,
  merchantName: string = DEFAULT_PIX_NAME,
  merchantCity: string = DEFAULT_PIX_CITY
): string {
  const cleanKey = pixKey.trim();
  const cleanName = sanitizeText(merchantName || DEFAULT_PIX_NAME, 25);
  const cleanCity = sanitizeText(merchantCity || DEFAULT_PIX_CITY, 15);

  // 00: Payload Format Indicator
  let payload = formatTlv('00', '01');

  // 26: Merchant Account Information - Pix
  const gui = formatTlv('00', 'br.gov.bcb.pix');
  const keyField = formatTlv('01', cleanKey);
  payload += formatTlv('26', `${gui}${keyField}`);

  // 52: Merchant Category Code (0000 = Padrão)
  payload += formatTlv('52', '0000');

  // 53: Transaction Currency (986 = Real Brasileiro / BRL)
  payload += formatTlv('53', '986');

  // 54: Transaction Amount (opcional ou fixado se fornecido)
  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatTlv('54', formattedAmount);
  }

  // 58: Country Code (BR)
  payload += formatTlv('58', 'BR');

  // 59: Merchant Name
  payload += formatTlv('59', cleanName);

  // 60: Merchant City
  payload += formatTlv('60', cleanCity);

  // 62: Additional Data Field Template (txid)
  const txid = formatTlv('05', '***');
  payload += formatTlv('62', txid);

  // 63: CRC16 prefixo
  payload += '6304';

  // Adiciona o checksum calculado
  const crc = computeCrc16(payload);
  return `${payload}${crc}`;
}

/**
 * Retorna a URL do QR Code gerado para o Pix
 */
export function getPixQrCodeUrl(brCode: string, size: number = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(brCode)}&color=09090b`;
}
