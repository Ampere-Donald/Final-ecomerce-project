export const NEWOTEG_PRINTER_SETUP_URL = '/downloads/Newoteg-Printer-Setup.exe';
export const EPSON_SUPPORT_URL = 'https://epson.com/Support/Point-of-Sale/Thermal-Printers/Epson-TM-T20II-Series/s/SPT_C31CD52062?review-filter=Windows';
export const PRINTER_SETUP_RETURN_PARAM = 'printerSetup';

export type UsbDeviceInfo = {
  vendorId?: string | number;
  productId?: string | number;
  manufacturer?: string;
  product?: string;
  serial?: string;
};

export type SupportedEpsonDevice = UsbDeviceInfo & {
  model: 'Epson TM-T20II';
  normalizedVendorId: '04b8';
  normalizedProductId: '0e15';
};

function normalizeUsbId(value: string | number | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value).toString(16).padStart(4, '0').toLowerCase();
  }
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^0x/, '')
    .replace(/[^0-9a-f]/g, '')
    .padStart(4, '0');
}

export function findSupportedEpsonUsbDevice(
  devices: UsbDeviceInfo[],
): SupportedEpsonDevice | null {
  const device = devices.find(
    (candidate) => normalizeUsbId(candidate.vendorId) === '04b8'
      && normalizeUsbId(candidate.productId) === '0e15',
  );
  if (!device) return null;
  return {
    ...device,
    model: 'Epson TM-T20II',
    normalizedVendorId: '04b8',
    normalizedProductId: '0e15',
  };
}

export function isWindowsDevice(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return /Windows/i.test(userAgent);
}
