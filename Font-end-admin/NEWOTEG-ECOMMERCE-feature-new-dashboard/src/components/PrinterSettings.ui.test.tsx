import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PrinterSettings } from './PrinterSettings';

vi.mock('../services/qzPrinter', () => ({
  classifyPrinterError: () => ({ code: 'QZ_UNAVAILABLE', message: 'QZ Tray indisponible.' }),
  disconnect: vi.fn(),
  getPrinterHost: () => '',
  getPrinterName: () => '',
  inspectPrinterStatus: vi.fn(),
  isAndroidDevice: () => false,
  isPhysicalPrinter: () => true,
  listPrinters: vi.fn().mockRejectedValue(new Error('QZ Tray indisponible')),
  listUsbDevices: vi.fn().mockResolvedValue([]),
  printRaw: vi.fn(),
  QZ_TRAY_DOWNLOAD_URL: 'https://qz.io/download/',
  setPrinterHost: vi.fn(),
  setPrinterName: vi.fn(),
}));

vi.mock('../services/workstation', () => ({
  getWorkstationName: () => '',
  setWorkstationName: vi.fn(),
}));

describe('PrinterSettings', () => {
  it('affiche le téléchargement Newoteg même lorsque QZ Tray est indisponible', async () => {
    render(<PrinterSettings />);

    const link = await screen.findByRole('link', {
      name: 'Télécharger Newoteg Printer Setup',
    });

    expect(link.getAttribute('href')).toBe('/downloads/Newoteg-Printer-Setup.exe?v=20260801');
    expect(link.getAttribute('download')).toBe('Newoteg-Printer-Setup.exe');
  });
});
