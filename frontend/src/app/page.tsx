import FormularioPCR from "@/components/FormularioPCR"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F9F8F4] relative">
      {/* Botón Flotante para el Dashboard */}
      <div className="fixed top-4 right-4 z-50">
        <a href="/dashboard">
          <button className="bg-[#e4769a] text-white px-4 py-2 rounded-lg shadow-md hover:bg-[#c6587c] transition-all font-semibold">
            📊 Ver Registros
          </button>
        </a>
      </div>
      <FormularioPCR />
    </div>
  )
}
