import { useEffect, useRef, useState } from 'react'
import { Workflow, RefreshCw, Loader2, Download } from 'lucide-react'
// @ts-ignore
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-js.css'

const BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="CannTrace" targetNamespace="http://canntrace">
  <bpmn:process id="Seed2Sale" isExecutable="false">
    <bpmn:startEvent id="start" name="Planta madre"><bpmn:outgoing>f1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:task id="t1" name="Esquejado"><bpmn:incoming>f1</bpmn:incoming><bpmn:outgoing>f2</bpmn:outgoing></bpmn:task>
    <bpmn:task id="t2" name="Aeroclonador (14d)"><bpmn:incoming>f2</bpmn:incoming><bpmn:outgoing>f3</bpmn:outgoing></bpmn:task>
    <bpmn:exclusiveGateway id="g1" name="Sistema?"><bpmn:incoming>f3</bpmn:incoming><bpmn:outgoing>f4a</bpmn:outgoing><bpmn:outgoing>f4b</bpmn:outgoing></bpmn:exclusiveGateway>
    <bpmn:task id="t3a" name="Vegetativo COCO (SFL1)"><bpmn:incoming>f4a</bpmn:incoming><bpmn:outgoing>f5a</bpmn:outgoing></bpmn:task>
    <bpmn:task id="t3b" name="Vegetativo RDWC (SFL2)"><bpmn:incoming>f4b</bpmn:incoming><bpmn:outgoing>f5b</bpmn:outgoing></bpmn:task>
    <bpmn:task id="t4a" name="Floración COCO (65d)"><bpmn:incoming>f5a</bpmn:incoming><bpmn:outgoing>f6a</bpmn:outgoing></bpmn:task>
    <bpmn:task id="t4b" name="Floración RDWC (65d)"><bpmn:incoming>f5b</bpmn:incoming><bpmn:outgoing>f6b</bpmn:outgoing></bpmn:task>
    <bpmn:task id="t5" name="Cosecha"><bpmn:incoming>f6a</bpmn:incoming><bpmn:incoming>f6b</bpmn:incoming><bpmn:outgoing>f7</bpmn:outgoing></bpmn:task>
    <bpmn:task id="t6" name="Secado (cuadros CDS)"><bpmn:incoming>f7</bpmn:incoming><bpmn:outgoing>f8</bpmn:outgoing></bpmn:task>
    <bpmn:task id="t7" name="Trimming"><bpmn:incoming>f8</bpmn:incoming><bpmn:outgoing>f9</bpmn:outgoing></bpmn:task>
    <bpmn:task id="t8" name="Análisis laboratorio HPLC/GC"><bpmn:incoming>f9</bpmn:incoming><bpmn:outgoing>f10</bpmn:outgoing></bpmn:task>
    <bpmn:exclusiveGateway id="g2" name="Aprueba?"><bpmn:incoming>f10</bpmn:incoming><bpmn:outgoing>f11</bpmn:outgoing><bpmn:outgoing>f12</bpmn:outgoing></bpmn:exclusiveGateway>
    <bpmn:task id="t9" name="Cuarentena (14-19d)"><bpmn:incoming>f11</bpmn:incoming><bpmn:outgoing>f13</bpmn:outgoing></bpmn:task>
    <bpmn:task id="tR" name="Rechazo / disposición"><bpmn:incoming>f12</bpmn:incoming><bpmn:outgoing>fR</bpmn:outgoing></bpmn:task>
    <bpmn:task id="t10" name="Fraccionamiento"><bpmn:incoming>f13</bpmn:incoming><bpmn:outgoing>f14</bpmn:outgoing></bpmn:task>
    <bpmn:task id="t11" name="Almacén final (Depósito)"><bpmn:incoming>f14</bpmn:incoming><bpmn:outgoing>f15</bpmn:outgoing></bpmn:task>
    <bpmn:endEvent id="end" name="Paquete entregado a paciente"><bpmn:incoming>f15</bpmn:incoming></bpmn:endEvent>
    <bpmn:endEvent id="endR" name="Descarte CM-RE-0910"><bpmn:incoming>fR</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="t1" />
    <bpmn:sequenceFlow id="f2" sourceRef="t1" targetRef="t2" />
    <bpmn:sequenceFlow id="f3" sourceRef="t2" targetRef="g1" />
    <bpmn:sequenceFlow id="f4a" name="COCO" sourceRef="g1" targetRef="t3a" />
    <bpmn:sequenceFlow id="f4b" name="RDWC" sourceRef="g1" targetRef="t3b" />
    <bpmn:sequenceFlow id="f5a" sourceRef="t3a" targetRef="t4a" />
    <bpmn:sequenceFlow id="f5b" sourceRef="t3b" targetRef="t4b" />
    <bpmn:sequenceFlow id="f6a" sourceRef="t4a" targetRef="t5" />
    <bpmn:sequenceFlow id="f6b" sourceRef="t4b" targetRef="t5" />
    <bpmn:sequenceFlow id="f7" sourceRef="t5" targetRef="t6" />
    <bpmn:sequenceFlow id="f8" sourceRef="t6" targetRef="t7" />
    <bpmn:sequenceFlow id="f9" sourceRef="t7" targetRef="t8" />
    <bpmn:sequenceFlow id="f10" sourceRef="t8" targetRef="g2" />
    <bpmn:sequenceFlow id="f11" name="Sí" sourceRef="g2" targetRef="t9" />
    <bpmn:sequenceFlow id="f12" name="No" sourceRef="g2" targetRef="tR" />
    <bpmn:sequenceFlow id="f13" sourceRef="t9" targetRef="t10" />
    <bpmn:sequenceFlow id="f14" sourceRef="t10" targetRef="t11" />
    <bpmn:sequenceFlow id="f15" sourceRef="t11" targetRef="end" />
    <bpmn:sequenceFlow id="fR" sourceRef="tR" targetRef="endR" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="d">
    <bpmndi:BPMNPlane id="p" bpmnElement="Seed2Sale">
      <bpmndi:BPMNShape id="_start" bpmnElement="start"><dc:Bounds x="40" y="180" width="36" height="36" /><bpmndi:BPMNLabel><dc:Bounds x="25" y="220" width="66" height="27" /></bpmndi:BPMNLabel></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t1" bpmnElement="t1"><dc:Bounds x="120" y="158" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t2" bpmnElement="t2"><dc:Bounds x="260" y="158" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_g1" bpmnElement="g1" isMarkerVisible="true"><dc:Bounds x="405" y="173" width="50" height="50" /><bpmndi:BPMNLabel><dc:Bounds x="405" y="140" width="50" height="14" /></bpmndi:BPMNLabel></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t3a" bpmnElement="t3a"><dc:Bounds x="500" y="80" width="120" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t3b" bpmnElement="t3b"><dc:Bounds x="500" y="240" width="120" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t4a" bpmnElement="t4a"><dc:Bounds x="660" y="80" width="120" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t4b" bpmnElement="t4b"><dc:Bounds x="660" y="240" width="120" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t5" bpmnElement="t5"><dc:Bounds x="820" y="158" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t6" bpmnElement="t6"><dc:Bounds x="960" y="158" width="120" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t7" bpmnElement="t7"><dc:Bounds x="1120" y="158" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t8" bpmnElement="t8"><dc:Bounds x="1260" y="158" width="140" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_g2" bpmnElement="g2" isMarkerVisible="true"><dc:Bounds x="1440" y="173" width="50" height="50" /><bpmndi:BPMNLabel><dc:Bounds x="1440" y="140" width="50" height="14" /></bpmndi:BPMNLabel></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t9" bpmnElement="t9"><dc:Bounds x="1530" y="80" width="120" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_tR" bpmnElement="tR"><dc:Bounds x="1530" y="240" width="140" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t10" bpmnElement="t10"><dc:Bounds x="1690" y="80" width="120" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_t11" bpmnElement="t11"><dc:Bounds x="1850" y="80" width="140" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_end" bpmnElement="end"><dc:Bounds x="2030" y="102" width="36" height="36" /><bpmndi:BPMNLabel><dc:Bounds x="2000" y="144" width="96" height="27" /></bpmndi:BPMNLabel></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_endR" bpmnElement="endR"><dc:Bounds x="1710" y="262" width="36" height="36" /><bpmndi:BPMNLabel><dc:Bounds x="1680" y="305" width="96" height="14" /></bpmndi:BPMNLabel></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="_f1" bpmnElement="f1"><di:waypoint x="76" y="198" /><di:waypoint x="120" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f2" bpmnElement="f2"><di:waypoint x="220" y="198" /><di:waypoint x="260" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f3" bpmnElement="f3"><di:waypoint x="360" y="198" /><di:waypoint x="405" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f4a" bpmnElement="f4a"><di:waypoint x="430" y="173" /><di:waypoint x="430" y="120" /><di:waypoint x="500" y="120" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f4b" bpmnElement="f4b"><di:waypoint x="430" y="223" /><di:waypoint x="430" y="280" /><di:waypoint x="500" y="280" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f5a" bpmnElement="f5a"><di:waypoint x="620" y="120" /><di:waypoint x="660" y="120" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f5b" bpmnElement="f5b"><di:waypoint x="620" y="280" /><di:waypoint x="660" y="280" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f6a" bpmnElement="f6a"><di:waypoint x="780" y="120" /><di:waypoint x="800" y="120" /><di:waypoint x="800" y="198" /><di:waypoint x="820" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f6b" bpmnElement="f6b"><di:waypoint x="780" y="280" /><di:waypoint x="800" y="280" /><di:waypoint x="800" y="198" /><di:waypoint x="820" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f7" bpmnElement="f7"><di:waypoint x="920" y="198" /><di:waypoint x="960" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f8" bpmnElement="f8"><di:waypoint x="1080" y="198" /><di:waypoint x="1120" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f9" bpmnElement="f9"><di:waypoint x="1220" y="198" /><di:waypoint x="1260" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f10" bpmnElement="f10"><di:waypoint x="1400" y="198" /><di:waypoint x="1440" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f11" bpmnElement="f11"><di:waypoint x="1465" y="173" /><di:waypoint x="1465" y="120" /><di:waypoint x="1530" y="120" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f12" bpmnElement="f12"><di:waypoint x="1465" y="223" /><di:waypoint x="1465" y="280" /><di:waypoint x="1530" y="280" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f13" bpmnElement="f13"><di:waypoint x="1650" y="120" /><di:waypoint x="1690" y="120" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f14" bpmnElement="f14"><di:waypoint x="1810" y="120" /><di:waypoint x="1850" y="120" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_f15" bpmnElement="f15"><di:waypoint x="1990" y="120" /><di:waypoint x="2030" y="120" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="_fR" bpmnElement="fR"><di:waypoint x="1670" y="280" /><di:waypoint x="1710" y="280" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

export default function PaginaProcesos() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return
    const viewer = new BpmnViewer({ container: containerRef.current })
    viewerRef.current = viewer
    viewer.importXML(BPMN_XML).then(() => {
      const canvas = viewer.get('canvas') as any
      canvas?.zoom?.('fit-viewport')
      setCargando(false)
    }).catch((e: any) => {
      console.error('BPMN import error', e); setCargando(false)
    })
    return () => viewer.destroy()
  }, [])

  function descargar() {
    viewerRef.current?.saveXML({ format: true }).then((res: any) => {
      const blob = new Blob([res.xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'CannTrace_proceso_seed2sale.bpmn'; a.click()
      URL.revokeObjectURL(url)
    })
  }

  function reset() {
    viewerRef.current?.get('canvas')?.zoom('fit-viewport')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <Workflow className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Mapa de Procesos</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              Flujo seed-to-sale
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span>BPMN 2.0 · GAMP5 Cat.5</span>
            </div>
          </div>
          <div className="flex-1" />
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#101016] hover:bg-[#15151d] border border-[#1f1f2b] hover:border-[#2a2a3a] text-[#a6a6b5] rounded-lg text-[11px] transition-colors"
          >
            <RefreshCw className="w-3 h-3" strokeWidth={1.8} />
            <span className="hidden sm:inline">Ajustar</span>
          </button>
          <button
            onClick={descargar}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#a3e635]/15 hover:bg-[#a3e635]/25 border border-[#404d20] text-[#d9f99d] rounded-lg text-[11px] transition-colors"
          >
            <Download className="w-3 h-3" strokeWidth={1.8} />
            <span className="hidden sm:inline">BPMN XML</span>
          </button>
        </div>
      </div>

      {/* Canvas BPMN — fondo blanco requerido por bpmn-js */}
      <div className="flex-1 relative overflow-hidden">
        {cargando && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0f]">
            <Loader2 className="w-8 h-8 animate-spin text-[#a3e635]" />
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ background: 'white', minHeight: 600 }}
        />
      </div>
    </div>
  )
}
