// Shared client-side PDF export used by the resume builder.
// Renders an element with html2canvas-pro and slices long content across A4 pages.
// Enforces a 5 MB output limit to prevent excessively large PDFs.

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function downloadElementAsPdf(element: HTMLElement, filename: string): Promise<void> {
  const prevMaxHeight = element.style.maxHeight;
  const prevOverflow = element.style.overflow;
  const hidden: { el: HTMLElement; prev: string }[] = [];

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas-pro'),
      import('jspdf'),
    ]);

    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
    element.querySelectorAll<HTMLElement>('[data-pdf-hide]').forEach((el) => {
      hidden.push({ el, prev: el.style.display });
      el.style.display = 'none';
    });

    await document.fonts?.ready;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH - margin * 2) {
      pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
    } else {
      const pxPerMm = canvas.width / imgW;
      const pagePx = Math.floor((pageH - margin * 2) * pxPerMm);
      let done = 0;
      let first = true;
      while (done < canvas.height) {
        const sliceH = Math.min(pagePx, canvas.height - done);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = sliceH;
        slice.getContext('2d')?.drawImage(canvas, 0, done, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (!first) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, imgW, (sliceH * imgW) / canvas.width);
        done += sliceH;
        first = false;
      }
    }

    // Estimate output size and enforce 5 MB limit
    const pdfBytes = pdf.output('arraybuffer');
    if (pdfBytes.byteLength > MAX_PDF_SIZE_BYTES) {
      throw new Error(`ไฟล์ PDF ใหญ่เกิน 5 MB (${Math.round(pdfBytes.byteLength / 1024 / 1024)} MB) ลดเนื้อหาในเรซูเม่แล้วลองใหม่`);
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } finally {
    hidden.forEach(({ el, prev }) => {
      el.style.display = prev;
    });
    element.style.maxHeight = prevMaxHeight;
    element.style.overflow = prevOverflow;
  }
}
