/**
 * QR Code Generation Utility
 *
 * Generates QR code for sharing scan reports.
 * Uses QRCode.js library for proper QR code generation.
 */

import QRCode from 'qrcode';

export interface QRCodeOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate QR code as SVG data URL
 *
 * @param data - The URL or text to encode in the QR code
 * @param options - QR code rendering options
 * @returns SVG data URL that can be used in <img> src attribute
 */
export async function generateQRCode(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    size = 200,
    margin = 2,
    color = {
      dark: '#000000',
      light: '#ffffff',
    },
  } = options;

  try {
    // Use QRCode.js library to generate proper QR code
    const dataUrl = await QRCode.toDataURL(data, {
      width: size,
      margin: margin,
      color: {
        dark: color.dark,
        light: color.light,
      },
      type: 'image/png',
      errorCorrectionLevel: 'M', // Medium error correction for better scannability
    });

    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    // Fallback to empty QR code placeholder
    return generatePlaceholderQR(size);
  }
}

/**
 * Generate a placeholder QR code (fallback)
 */
function generatePlaceholderQR(size: number): string {
  const svgSize = size;
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">`;
  svgContent += `<rect width="100%" height="100%" fill="#ffffff"/>`;
  svgContent += `<rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.35}" height="${size * 0.35}" fill="#000000"/>`;
  svgContent += `<rect x="${size * 0.55}" y="${size * 0.1}" width="${size * 0.35}" height="${size * 0.35}" fill="#000000"/>`;
  svgContent += `<rect x="${size * 0.1}" y="${size * 0.55}" width="${size * 0.35}" height="${size * 0.35}" fill="#000000"/>`;
  svgContent += '</svg>';

  const base64 = Buffer.from(svgContent).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate QR code as SVG string (not data URL)
 * Useful for server-side rendering
 */
export async function generateQRCodeSVG(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  try {
    const svg = await QRCode.toString(data, {
      width: options.size || 200,
      margin: options.margin || 2,
      color: options.color,
      type: 'svg',
      errorCorrectionLevel: 'M',
    });
    return svg;
  } catch (error) {
    console.error('Failed to generate QR code SVG:', error);
    return '';
  }
}

/**
 * Get poster URL for a scan report
 */
export function getPosterUrl(scanId: string, baseUrl: string = ''): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base}/scan/poster/${scanId}`;
}

/**
 * Get report URL for a scan
 */
export function getReportUrl(scanId: string, baseUrl: string = ''): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base}/scan/report/${scanId}`;
}
