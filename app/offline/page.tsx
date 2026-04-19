export const metadata = {
  title: "Sin conexión",
};

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Sin conexión</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        No hay Internet ahora mismo. Los cambios que hagas se intentarán enviar cuando vuelva la
        conexión.
      </p>
    </main>
  );
}
