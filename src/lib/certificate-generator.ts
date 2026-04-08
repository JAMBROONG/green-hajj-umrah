import { jsPDF } from 'jspdf'

interface CertificateData {
  recipientName: string
  activityTitle: string
  amount: number
  donationDate: string
  certificateType: 'thank-you' | 'participation'
}

export function generateCertificatePDF(data: CertificateData): Buffer {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Background color
  pdf.setFillColor(245, 245, 245)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')

  // Border
  pdf.setDrawColor(34, 139, 92) // Primary color
  pdf.setLineWidth(2)
  pdf.rect(10, 10, pageWidth - 20, pageHeight - 20)

  // Inner border
  pdf.setLineWidth(0.5)
  pdf.rect(12, 12, pageWidth - 24, pageHeight - 24)

  // Logo or title area
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(24)
  pdf.setTextColor(34, 139, 92)
  pdf.text('GREEN HAJJ UMRAH', pageWidth / 2, 30, { align: 'center' })

  // Certificate title
  pdf.setFontSize(28)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  if (data.certificateType === 'thank-you') {
    pdf.text('SERTIFIKAT UCAPAN TERIMA KASIH', pageWidth / 2, 50, { align: 'center' })
  } else {
    pdf.text('SERTIFIKAT PARTISIPASI', pageWidth / 2, 50, { align: 'center' })
  }

  // Decorative line
  pdf.setDrawColor(34, 139, 92)
  pdf.setLineWidth(1)
  pdf.line(40, 60, pageWidth - 40, 60)

  // Certificate body text
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(50, 50, 50)

  const bodyY = 75
  const lineHeight = 7

  if (data.certificateType === 'thank-you') {
    pdf.text('Dengan ini kami mengucapkan terima kasih atas kontribusi Anda dalam', pageWidth / 2, bodyY, {
      align: 'center',
      maxWidth: pageWidth - 40,
    })
    pdf.text('mendukung kegiatan sosial perusahaan kami.', pageWidth / 2, bodyY + lineHeight, {
      align: 'center',
      maxWidth: pageWidth - 40,
    })
  } else {
    pdf.text('Dengan bangga kami berikan sertifikat ini kepada:', pageWidth / 2, bodyY, {
      align: 'center',
      maxWidth: pageWidth - 40,
    })
  }

  // Recipient name
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(34, 139, 92)
  pdf.text(data.recipientName, pageWidth / 2, bodyY + lineHeight * 5, { align: 'center' })

  // Details
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(50, 50, 50)

  const detailsY = bodyY + lineHeight * 8
  pdf.text(`Telah berpartisipasi dalam kegiatan CSR:`, 30, detailsY)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.activityTitle, 30, detailsY + lineHeight * 1.5, { maxWidth: pageWidth - 60 })

  pdf.setFont('helvetica', 'normal')
  pdf.text(`Jumlah Donasi: Rp ${data.amount.toLocaleString('id-ID')}`, 30, detailsY + lineHeight * 3.5)
  pdf.text(`Tanggal: ${data.donationDate}`, 30, detailsY + lineHeight * 4.5)

  // Footer message
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(9)
  pdf.setTextColor(100, 100, 100)
  pdf.text('Kami menghargai kontribusi Anda untuk dunia yang lebih berkelanjutan.', pageWidth / 2, pageHeight - 20, {
    align: 'center',
  })

  // Signature lines
  const signatureY = pageHeight - 35
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(0, 0, 0)

  // Left signature
  pdf.line(30, signatureY - 15, 60, signatureY - 15)
  pdf.text('Penerima Donasi', 45, signatureY, { align: 'center' })

  // Right signature
  pdf.line(pageWidth - 60, signatureY - 15, pageWidth - 30, signatureY - 15)
  pdf.text('Penyelenggara', pageWidth - 45, signatureY, { align: 'center' })

  return Buffer.from(pdf.output('arraybuffer'))
}

export function generateThankYouCertificate(data: Omit<CertificateData, 'certificateType'>): Buffer {
  return generateCertificatePDF({ ...data, certificateType: 'thank-you' })
}

export function generateParticipationCertificate(data: Omit<CertificateData, 'certificateType'>): Buffer {
  return generateCertificatePDF({ ...data, certificateType: 'participation' })
}
