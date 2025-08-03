import { create } from 'zustand';

interface IPrinterStore {
  toggleCharacteristic: any;
  printerState: boolean;
  connect: (toggleCharacteristic: any) => void;
  disconnect: () => void;
}

const usePrinterStore = create<IPrinterStore>((set) => ({
  toggleCharacteristic: undefined,
  printerState: false,
  connect: (toggleCharacteristic: any) =>
    set(() => ({
      toggleCharacteristic,
      printerState: true,
    })),
  disconnect: () =>
    set(() => ({
      toggleCharacteristic: undefined,
      printerState: false,
    })),
}));

export default usePrinterStore;