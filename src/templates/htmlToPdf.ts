import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export async function downloadHtmlAsPdf(
  html: string,
  fileName: string,
  title = 'Documento'
): Promise<void> {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '794px',
    padding: '32px',
    background: '#ffffff',
    color: '#111111',
    fontFamily: 'Georgia, "Times New Roman", serif',
    lineHeight: '1.5',
  })

  const page = document.createElement('div')
  page.className = 'template-rendered-document'
  page.innerHTML = html
  host.appendChild(page)
  document.body.appendChild(host)

  try {
    const canvas = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    const image = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageWidth = pageWidth
    const imageHeight = (canvas.height * imageWidth) / canvas.width
    let heightLeft = imageHeight
    let position = 0

    pdf.setProperties({ title })
    pdf.addImage(image, 'PNG', 0, position, imageWidth, imageHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imageHeight
      pdf.addPage()
      pdf.addImage(image, 'PNG', 0, position, imageWidth, imageHeight)
      heightLeft -= pageHeight
    }

    pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`)
  } finally {
    host.remove()
  }
}
