import JsBarcode from 'jsbarcode'
import { useEffect, useRef } from 'react'

interface BarcodeProps {
  value: string
  className?: string
}

// Stregkoden tegnes med JsBarcode direkte i et SVG-element. Bagefter flyttes
// den faktiske pixel-størrelse over i en viewBox, så CSS kan sætte en fast
// fysisk bredde (cm) på print uden at forvride stregerne.
export function Barcode({ value, className }: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    JsBarcode(svg, value, {
      format: 'CODE128',
      displayValue: false,
      margin: 10,
      height: 60,
      width: 2,
    })

    const width = svg.getAttribute('width')
    const height = svg.getAttribute('height')
    if (width && height) {
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.removeAttribute('width')
      svg.removeAttribute('height')
    }
  }, [value])

  return <svg ref={svgRef} className={className} role="img" aria-label={`Stregkode ${value}`} />
}
