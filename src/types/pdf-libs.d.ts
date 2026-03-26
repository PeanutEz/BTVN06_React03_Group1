declare module "jspdf" {
  export interface JsPdfOptions {
    orientation?: "portrait" | "landscape";
    unit?: string;
    format?: string | [number, number];
  }

  export default class jsPDF {
    constructor(options?: JsPdfOptions);
    internal: {
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
    addPage(): this;
    addImage(
      imageData: string,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number,
    ): this;
    save(filename: string): void;
  }
}

declare module "html2canvas" {
  export interface Html2CanvasOptions {
    scale?: number;
    useCORS?: boolean;
    backgroundColor?: string | null;
    logging?: boolean;
  }

  export default function html2canvas(
    element: HTMLElement,
    options?: Html2CanvasOptions,
  ): Promise<HTMLCanvasElement>;
}
