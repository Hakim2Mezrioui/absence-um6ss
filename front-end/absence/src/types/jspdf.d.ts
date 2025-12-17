declare module 'jspdf' {
  export default class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string);
    setFontSize(size: number): void;
    setTextColor(r: number, g: number, b: number): void;
    text(text: string, x: number, y: number, options?: any): void;
    save(filename: string): void;
    setPage(page: number): void;
    internal: {
      getNumberOfPages(): number;
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
  }
}

declare module 'jspdf-autotable' {
  import jsPDF from 'jspdf';
  export default function autoTable(doc: jsPDF, options: any): void;
}

