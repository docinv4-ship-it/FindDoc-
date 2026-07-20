import Header from "@/components/patient/Header";
import BottomNav from "@/components/patient/BottomNav";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col antialiased">
      <Header />
      <main className="flex-1 max-w-xl w-full mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
