// Componente QR compartido. react-qr-code 2.0.18 es CJS y Vite lo doble-wrappea,
// asi que resolvemos el componente de forma robusta (mismo criterio que PaginaEtiquetasQR).
import * as ReactQRCode from 'react-qr-code'

const isComponent = (x: any) => x && (typeof x === 'function' || (typeof x === 'object' && (x.$$typeof || x.render || x.prototype?.render)))
const _m = ReactQRCode as any
const QRCodeBase: any =
  (isComponent(_m) && _m) ||
  (isComponent(_m.default) && _m.default) ||
  (isComponent(_m.default?.default) && _m.default.default) ||
  (isComponent(_m.default?.QRCode) && _m.default.QRCode) ||
  (isComponent(_m.QRCode) && _m.QRCode) ||
  (() => null)

export default function QR({ value, size = 128 }: { value: string; size?: number }) {
  return (
    <div className="inline-block bg-white p-2 rounded-lg">
      <QRCodeBase value={value} size={size} level="M" />
    </div>
  )
}
